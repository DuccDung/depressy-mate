using System.Globalization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/posts")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class PostsApiController : ControllerBase
{
    private const int MaxPostContentLength = 3000;
    private const int MaxCommentLength = 1000;

    private readonly DepressyMateContext _context;

    public PostsApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetPosts(
        [FromQuery] int limit = 10,
        [FromQuery] string? cursor = null,
        [FromQuery] bool savedOnly = false,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? mediaType = null,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = ChatService.GetUserId(User);
        var safeLimit = Math.Clamp(limit, 5, 30);
        var cursorDate = ParseCursor(cursor);
        var normalizedMediaType = NormalizeMediaTypeFilter(mediaType);

        var query = _context.Posts
            .AsNoTracking()
            .Include(post => post.User)
            .ThenInclude(user => user.Profile)
            .Where(post => post.DeletedAt == null);

        if (savedOnly)
        {
            query = query.Where(post => post.PostSaves.Any(save => save.UserId == currentUserId));
        }

        if (userId.HasValue)
        {
            query = query.Where(post => post.UserId == userId.Value);
        }

        if (normalizedMediaType is not null)
        {
            query = query.Where(post => post.MediaType == normalizedMediaType);
        }

        if (cursorDate.HasValue)
        {
            query = query.Where(post => post.CreatedAt < cursorDate.Value);
        }

        var rows = await query
            .OrderByDescending(post => post.CreatedAt)
            .Take(safeLimit + 1)
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > safeLimit;
        if (hasMore)
        {
            rows.RemoveAt(rows.Count - 1);
        }

        var postIds = rows.Select(post => post.Id).ToList();
        var likedIds = await _context.PostLikes
            .AsNoTracking()
            .Where(like => like.UserId == currentUserId && postIds.Contains(like.PostId))
            .Select(like => like.PostId)
            .ToListAsync(cancellationToken);
        var savedIds = await _context.PostSaves
            .AsNoTracking()
            .Where(save => save.UserId == currentUserId && postIds.Contains(save.PostId))
            .Select(save => save.PostId)
            .ToListAsync(cancellationToken);

        var likedSet = likedIds.ToHashSet();
        var savedSet = savedIds.ToHashSet();

        return Ok(new PagedPostsDto
        {
            Data = rows.Select(post => MapPostDto(post, likedSet.Contains(post.Id), savedSet.Contains(post.Id))).ToList(),
            HasMore = hasMore,
            NextCursor = hasMore && rows.Count > 0
                ? rows.Last().CreatedAt.ToString("O", CultureInfo.InvariantCulture)
                : null
        });
    }

    [HttpGet("saved")]
    public Task<IActionResult> GetSavedPosts([FromQuery] int limit = 10, [FromQuery] string? cursor = null, CancellationToken cancellationToken = default)
    {
        return GetPosts(limit, cursor, true, null, null, cancellationToken);
    }

    [HttpGet("{postId:guid}")]
    public async Task<IActionResult> GetPost(Guid postId, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var post = await _context.Posts
            .AsNoTracking()
            .Include(item => item.User)
            .ThenInclude(user => user.Profile)
            .FirstOrDefaultAsync(item => item.Id == postId && item.DeletedAt == null, cancellationToken);

        if (post is null)
        {
            return NotFound(new { error = "Khong tim thay bai viet." });
        }

        var isLiked = await _context.PostLikes
            .AsNoTracking()
            .AnyAsync(item => item.PostId == postId && item.UserId == currentUserId, cancellationToken);
        var isSaved = await _context.PostSaves
            .AsNoTracking()
            .AnyAsync(item => item.PostId == postId && item.UserId == currentUserId, cancellationToken);

        return Ok(MapPostDto(post, isLiked, isSaved));
    }

    [HttpPost]
    public async Task<IActionResult> CreatePost(CreatePostRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var content = Clean(request.Content);
        var mediaUrl = Clean(request.MediaUrl);
        var mediaType = NormalizeMediaType(request.MediaType, mediaUrl);

        if (content is null && mediaUrl is null)
        {
            return BadRequest(new { error = "Vui lòng nhập nội dung hoặc chọn ảnh/video." });
        }

        if (content?.Length > MaxPostContentLength)
        {
            return BadRequest(new { error = $"Bài viết không được vượt quá {MaxPostContentLength} ký tự." });
        }

        var now = DateTime.UtcNow;
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Content = content,
            MediaUrl = mediaUrl,
            MediaType = mediaType,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync(cancellationToken);

        var savedPost = await _context.Posts
            .AsNoTracking()
            .Include(item => item.User)
            .ThenInclude(user => user.Profile)
            .FirstAsync(item => item.Id == post.Id, cancellationToken);

        return Created($"/api/posts/{post.Id}", MapPostDto(savedPost, false, false));
    }

    [HttpPost("{postId:guid}/like")]
    public async Task<IActionResult> TogglePostLike(Guid postId, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var post = await _context.Posts.FirstOrDefaultAsync(item => item.Id == postId && item.DeletedAt == null, cancellationToken);
        if (post is null)
        {
            return NotFound(new { error = "Không tìm thấy bài viết." });
        }

        var existingLike = await _context.PostLikes
            .FirstOrDefaultAsync(item => item.PostId == postId && item.UserId == currentUserId, cancellationToken);

        string action;
        if (existingLike is null)
        {
            _context.PostLikes.Add(new PostLike
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = currentUserId,
                CreatedAt = DateTime.UtcNow
            });
            post.LikeCount++;
            action = "liked";
        }
        else
        {
            _context.PostLikes.Remove(existingLike);
            post.LikeCount = Math.Max(0, post.LikeCount - 1);
            action = "unliked";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { action, like_count = post.LikeCount, is_liked = action == "liked" });
    }

    [HttpPost("{postId:guid}/save")]
    public async Task<IActionResult> TogglePostSave(Guid postId, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var postExists = await _context.Posts.AnyAsync(item => item.Id == postId && item.DeletedAt == null, cancellationToken);
        if (!postExists)
        {
            return NotFound(new { error = "Không tìm thấy bài viết." });
        }

        var existingSave = await _context.PostSaves
            .FirstOrDefaultAsync(item => item.PostId == postId && item.UserId == currentUserId, cancellationToken);

        string action;
        if (existingSave is null)
        {
            _context.PostSaves.Add(new PostSave
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = currentUserId,
                CreatedAt = DateTime.UtcNow
            });
            action = "saved";
        }
        else
        {
            _context.PostSaves.Remove(existingSave);
            action = "unsaved";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { action, is_saved = action == "saved" });
    }

    [HttpGet("{postId:guid}/comments")]
    public async Task<IActionResult> GetComments(
        Guid postId,
        [FromQuery] int limit = 15,
        [FromQuery] string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = ChatService.GetUserId(User);
        var safeLimit = Math.Clamp(limit, 5, 40);
        var cursorDate = ParseCursor(cursor);

        var query = _context.Comments
            .AsNoTracking()
            .Include(comment => comment.User)
            .ThenInclude(user => user.Profile)
            .Where(comment => comment.PostId == postId && comment.ParentCommentId == null && comment.DeletedAt == null);

        if (cursorDate.HasValue)
        {
            query = query.Where(comment => comment.CreatedAt < cursorDate.Value);
        }

        var roots = await query
            .OrderByDescending(comment => comment.CreatedAt)
            .Take(safeLimit + 1)
            .ToListAsync(cancellationToken);

        var hasMore = roots.Count > safeLimit;
        if (hasMore)
        {
            roots.RemoveAt(roots.Count - 1);
        }

        roots.Reverse();
        var rootIds = roots.Select(comment => comment.Id).ToList();
        var replies = await _context.Comments
            .AsNoTracking()
            .Include(comment => comment.User)
            .ThenInclude(user => user.Profile)
            .Where(comment => comment.ParentCommentId != null && rootIds.Contains(comment.ParentCommentId.Value) && comment.DeletedAt == null)
            .OrderBy(comment => comment.CreatedAt)
            .ToListAsync(cancellationToken);

        var allCommentIds = roots.Select(comment => comment.Id).Concat(replies.Select(reply => reply.Id)).ToList();
        var likedIds = await _context.CommentLikes
            .AsNoTracking()
            .Where(like => like.UserId == currentUserId && allCommentIds.Contains(like.CommentId))
            .Select(like => like.CommentId)
            .ToListAsync(cancellationToken);
        var likedSet = likedIds.ToHashSet();

        var replyLookup = replies
            .GroupBy(reply => reply.ParentCommentId!.Value)
            .ToDictionary(group => group.Key, group => group.Select(reply => MapCommentDto(reply, likedSet.Contains(reply.Id))).ToList());

        var data = roots.Select(root =>
        {
            var dto = MapCommentDto(root, likedSet.Contains(root.Id));
            dto.Replies.AddRange(replyLookup.TryGetValue(root.Id, out var rootReplies) ? rootReplies : new List<CommentDto>());
            return dto;
        }).ToList();

        return Ok(new PagedCommentsDto
        {
            Data = data,
            HasMore = hasMore,
            NextCursor = hasMore && roots.Count > 0
                ? roots.First().CreatedAt.ToString("O", CultureInfo.InvariantCulture)
                : null
        });
    }

    [HttpPost("{postId:guid}/comments")]
    public async Task<IActionResult> CreateComment(Guid postId, CreateCommentRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var content = Clean(request.Content);
        if (content is null)
        {
            return BadRequest(new { error = "Bình luận không được để trống." });
        }

        if (content.Length > MaxCommentLength)
        {
            return BadRequest(new { error = $"Bình luận không được vượt quá {MaxCommentLength} ký tự." });
        }

        var post = await _context.Posts.FirstOrDefaultAsync(item => item.Id == postId && item.DeletedAt == null, cancellationToken);
        if (post is null)
        {
            return NotFound(new { error = "Không tìm thấy bài viết." });
        }

        Comment? parent = null;
        if (request.ParentCommentId.HasValue)
        {
            parent = await _context.Comments
                .FirstOrDefaultAsync(item =>
                    item.Id == request.ParentCommentId.Value &&
                    item.PostId == postId &&
                    item.ParentCommentId == null &&
                    item.DeletedAt == null,
                    cancellationToken);

            if (parent is null)
            {
                return BadRequest(new { error = "Bình luận gốc không hợp lệ." });
            }
        }

        var now = DateTime.UtcNow;
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            UserId = currentUserId,
            ParentCommentId = parent?.Id,
            Content = content,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Comments.Add(comment);
        post.CommentCount++;
        post.UpdatedAt = now;
        if (parent is not null)
        {
            parent.ReplyCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var savedComment = await _context.Comments
            .AsNoTracking()
            .Include(item => item.User)
            .ThenInclude(user => user.Profile)
            .FirstAsync(item => item.Id == comment.Id, cancellationToken);

        return Created($"/api/posts/{postId}/comments/{comment.Id}", MapCommentDto(savedComment, false));
    }

    [HttpPost("{postId:guid}/comments/{commentId:guid}/like")]
    public async Task<IActionResult> ToggleCommentLike(Guid postId, Guid commentId, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var comment = await _context.Comments
            .FirstOrDefaultAsync(item => item.Id == commentId && item.PostId == postId && item.DeletedAt == null, cancellationToken);

        if (comment is null)
        {
            return NotFound(new { error = "Không tìm thấy bình luận." });
        }

        var existingLike = await _context.CommentLikes
            .FirstOrDefaultAsync(item => item.CommentId == commentId && item.UserId == currentUserId, cancellationToken);

        string action;
        if (existingLike is null)
        {
            _context.CommentLikes.Add(new CommentLike
            {
                Id = Guid.NewGuid(),
                CommentId = commentId,
                UserId = currentUserId,
                CreatedAt = DateTime.UtcNow
            });
            comment.LikeCount++;
            action = "liked";
        }
        else
        {
            _context.CommentLikes.Remove(existingLike);
            comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
            action = "unliked";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { action, like_count = comment.LikeCount, is_liked = action == "liked" });
    }

    private static PostDto MapPostDto(Post post, bool isLiked, bool isSaved)
    {
        return new PostDto
        {
            Id = post.Id,
            UserId = post.UserId,
            Content = post.Content,
            MediaUrl = post.MediaUrl,
            MediaType = post.MediaType,
            LikeCount = post.LikeCount,
            CommentCount = post.CommentCount,
            CreatedAt = post.CreatedAt,
            UpdatedAt = post.UpdatedAt,
            AuthorName = GetDisplayName(post.User),
            AuthorAvatar = post.User.Profile?.AvatarUrl ?? post.User.AvatarUrl,
            IsLiked = isLiked,
            IsSaved = isSaved
        };
    }

    private static CommentDto MapCommentDto(Comment comment, bool isLiked)
    {
        return new CommentDto
        {
            Id = comment.Id,
            PostId = comment.PostId,
            UserId = comment.UserId,
            ParentCommentId = comment.ParentCommentId,
            Content = comment.Content,
            LikeCount = comment.LikeCount,
            ReplyCount = comment.ReplyCount,
            CreatedAt = comment.CreatedAt,
            AuthorName = GetDisplayName(comment.User),
            AuthorAvatar = comment.User.Profile?.AvatarUrl ?? comment.User.AvatarUrl,
            IsLiked = isLiked
        };
    }

    private static string GetDisplayName(User user)
    {
        return user.Profile?.FullName ?? user.FullName ?? user.Email;
    }

    private static DateTime? ParseCursor(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor))
        {
            return null;
        }

        return DateTime.TryParse(
            cursor,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal,
            out var parsedCursor)
            ? parsedCursor
            : null;
    }

    private static string? NormalizeMediaType(string? mediaType, string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return null;
        }

        var normalizedType = mediaType?.Trim().ToUpperInvariant();
        return normalizedType is "VIDEO" ? "VIDEO" : "IMAGE";
    }

    private static string? NormalizeMediaTypeFilter(string? mediaType)
    {
        var normalizedType = mediaType?.Trim().ToUpperInvariant();
        return normalizedType is "IMAGE" or "VIDEO" ? normalizedType : null;
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
