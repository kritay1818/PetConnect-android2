const express = require('express');

const {
  createPet,
  getPets,
  getMyPets,
  getPetById,
  updatePet,
  deletePet,
  searchPets
} = require('../controllers/petController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateCreatePet,
  validateUpdatePet,
  validateSearchPets,
  handleValidationErrors
} = require('../validators/petValidators');

const router = express.Router();

router.use(protect);

router.post('/', validateCreatePet, handleValidationErrors, createPet);
router.get('/', getPets);
router.get('/my', getMyPets);
router.get('/search', validateSearchPets, handleValidationErrors, searchPets);
router.get('/:id', getPetById);
router.put('/:id', validateUpdatePet, handleValidationErrors, updatePet);
router.delete('/:id', deletePet);

module.exports = router;
