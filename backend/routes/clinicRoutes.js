const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');

router.get('/', clinicController.getAllClinics);
router.get('/:id', clinicController.getClinicById);
router.post('/', clinicController.createClinic);
router.put('/:id', clinicController.updateClinic);
router.delete('/:id', clinicController.deleteClinic);

module.exports = router;
