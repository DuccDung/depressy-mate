import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface ResultGaugeProps {
  result: any;
  onClose?: () => void;
}

export default function ResultGauge({ result, onClose }: ResultGaugeProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Severity từ 0 đến 4
  const severity = result?.overall_severity || 0;
  
  const severityColors = ['#10B981', '#FBBF24', '#F59E0B', '#EF4444', '#991B1B'];
  const severityLabels = ['Bình thường', 'Nhẹ / Nguy cơ', 'Vừa', 'Nặng', 'Rất nặng'];
  
  const currentColor = severityColors[severity];
  const currentLabel = severityLabels[severity];

  useEffect(() => {
    // Góc xoay từ -90deg tới 90deg (180 độ)
    // 0 -> -90deg, 4 -> 90deg
    const targetValue = (severity / 4); // 0 to 1
    
    Animated.timing(animatedValue, {
      toValue: targetValue,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [severity]);

  const spin = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '90deg']
  });

  return (
    <View style={styles.container}>
      <View style={[styles.card, Shadows.ambient]}>
        <Text style={styles.title}>Kết quả: {result.assessment_code}</Text>
        
        {/* Gauge UI */}
        <View style={styles.gaugeWrapper}>
          <View style={styles.gaugeBackground} />
          <Animated.View style={[styles.needleContainer, { transform: [{ rotate: spin }] }]}>
            <View style={styles.needle} />
            <View style={styles.needleBase} />
          </Animated.View>
        </View>

        <Text style={[styles.severityLabel, { color: currentColor }]}>
          Mức độ: {currentLabel}
        </Text>
        
        <View style={styles.classificationsBox}>
          {Object.keys(result.classifications || {}).map((cat) => (
            <Text key={cat} style={styles.classText}>
              • {cat}: <Text style={{fontWeight: 'bold', color: Colors.light.onSurface}}>{result.classifications[cat]}</Text>
            </Text>
          ))}
        </View>

        {onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Đóng kết quả</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.outlineVariant,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.onSurface,
    marginBottom: 30,
    fontFamily: 'Manrope',
  },
  gaugeWrapper: {
    width: 200,
    height: 100,
    overflow: 'hidden', // Chỉ hiển thị nửa trên
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 20,
    position: 'relative',
  },
  gaugeBackground: {
    width: 200,
    height: 200, // Gấp đôi chiều cao
    borderRadius: 100,
    borderWidth: 20,
    borderColor: Colors.light.outlineVariant,
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    top: 0,
  },
  needleContainer: {
    width: 200,
    height: 100,
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    transformOrigin: 'bottom center', // Xoay quanh tâm viền dưới
  },
  needle: {
    width: 4,
    height: 80,
    backgroundColor: Colors.light.onSurface,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0, // Gắn ở đáy
  },
  needleBase: {
    width: 16,
    height: 16,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    position: 'absolute',
    bottom: -8, // Tâm nằm giữa đáy
  },
  severityLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  classificationsBox: {
    backgroundColor: Colors.light.surfaceContainerLow,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    marginBottom: 20,
  },
  classText: {
    color: Colors.light.onSurfaceVariant,
    fontSize: 15,
    marginBottom: 8,
    fontFamily: 'Manrope',
  },
  closeBtn: {
    backgroundColor: Colors.light.surfaceContainerHigh,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.sm,
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.light.onSurface,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Manrope',
  }
});
