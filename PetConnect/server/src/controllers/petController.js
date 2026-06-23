const mongoose = require('mongoose');

const Pet = require('../models/Pet');

const ensureValidObjectId = (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid pet id');
  }
};

const ensureOwner = (pet, userId, res) => {
  if (pet.owner.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('You cannot edit or delete another user\'s pet');
  }
};

const createPet = async (req, res, next) => {
  try {
    const pet = await Pet.create({
      ...req.body,
      owner: req.user._id
    });

    res.status(201).json({ pet });
  } catch (error) {
    next(error);
  }
};

const getPets = async (req, res, next) => {
  try {
    const pets = await Pet.find()
      .populate('owner', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ pets });
  } catch (error) {
    next(error);
  }
};

const getMyPets = async (req, res, next) => {
  try {
    const pets = await Pet.find({ owner: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({ pets });
  } catch (error) {
    next(error);
  }
};

const getPetById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, res);

    const pet = await Pet.findById(req.params.id).populate('owner', 'username email');
    if (!pet) {
      res.status(404);
      throw new Error('Pet not found');
    }

    res.status(200).json({ pet });
  } catch (error) {
    next(error);
  }
};

const updatePet = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, res);

    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      res.status(404);
      throw new Error('Pet not found');
    }

    ensureOwner(pet, req.user._id, res);

    const allowedUpdates = [
      'name',
      'type',
      'breed',
      'age',
      'city',
      'bio',
      'imageUrl',
      'imageUri',
      'photoUrl'
    ];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        pet[field] = req.body[field];
      }
    });

    const updatedPet = await pet.save();

    res.status(200).json({ pet: updatedPet });
  } catch (error) {
    next(error);
  }
};

const deletePet = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, res);

    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      res.status(404);
      throw new Error('Pet not found');
    }

    ensureOwner(pet, req.user._id, res);

    await pet.deleteOne();

    res.status(200).json({ message: 'Pet deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const searchPets = async (req, res, next) => {
  try {
    const { type, breed, city, minAge, maxAge } = req.query;
    const filters = {};

    if (type) {
      filters.type = type;
    }

    if (breed) {
      filters.breed = { $regex: breed, $options: 'i' };
    }

    if (city) {
      filters.city = { $regex: city, $options: 'i' };
    }

    if (minAge !== undefined || maxAge !== undefined) {
      filters.age = {};

      if (minAge !== undefined) {
        filters.age.$gte = Number(minAge);
      }

      if (maxAge !== undefined) {
        filters.age.$lte = Number(maxAge);
      }
    }

    const pets = await Pet.find(filters)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ pets });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPet,
  getPets,
  getMyPets,
  getPetById,
  updatePet,
  deletePet,
  searchPets
};
