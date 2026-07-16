import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit', 'other'];

const initialForm = {
  name: '',
  type: 'dog',
  breed: '',
  age: '',
  city: '',
  bio: '',
  imageUri: ''
};

const initialSearch = {
  type: '',
  breed: '',
  city: '',
  minAge: '',
  maxAge: ''
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const getId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
};

const isValidNonNegativeNumber = (value) => {
  if (!value.trim()) {
    return true;
  }

  const numberValue = Number(value);
  return !Number.isNaN(numberValue) && numberValue >= 0;
};

export default function MyPetsScreen() {
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState(initialSearch);
  const [editingPetId, setEditingPetId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [searchError, setSearchError] = useState('');

  const fetchPets = useCallback(async ({ refreshing = false } = {}) => {
    try {
      setError('');
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data } = await api.get('/pets/my');
      setPets(data.pets || []);
      setIsSearchActive(false);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Could not load your pets.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const updateField = (name, value) => {
    setFormError('');
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateSearchField = (name, value) => {
    setError('');
    setSearch((current) => {
      const nextSearch = { ...current, [name]: value };
      setSearchError(validateSearch(nextSearch));
      return nextSearch;
    });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingPetId(null);
    setFormError('');
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const openEditForm = (pet) => {
    setForm({
      name: pet.name || '',
      type: pet.type || 'dog',
      breed: pet.breed || '',
      age: pet.age === undefined || pet.age === null ? '' : String(pet.age),
      city: pet.city || '',
      bio: pet.bio || '',
      imageUri: pet.imageUri || ''
    });
    setEditingPetId(pet._id);
    setIsFormVisible(true);
    setFormError('');
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Pet name is required.';
    }

    if (!form.type.trim()) {
      return 'Pet type is required.';
    }

    if (form.age.trim() && Number.isNaN(Number(form.age))) {
      return 'Age must be a number.';
    }

    return '';
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    type: form.type,
    breed: form.breed.trim(),
    age: form.age.trim() ? Number(form.age) : undefined,
    city: form.city.trim(),
    bio: form.bio.trim(),
    imageUri: form.imageUri
  });

  const choosePhoto = async () => {
    try {
      setFormError('');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setFormError('Photo library permission is required to choose a pet photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.canceled && result.assets?.length) {
        updateField('imageUri', result.assets[0].uri);
      }
    } catch (pickerError) {
      setFormError('Could not open the photo library.');
    }
  };

  const handleSubmit = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      if (editingPetId) {
        await api.put(`/pets/${editingPetId}`, buildPayload());
      } else {
        await api.post('/pets', buildPayload());
      }

      resetForm();
      setIsFormVisible(false);
      await fetchPets();
    } catch (submitError) {
      setFormError(
        getErrorMessage(
          submitError,
          editingPetId ? 'Could not update pet.' : 'Could not create pet.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (pet) => {
    Alert.alert(
      'Delete pet',
      `Are you sure you want to delete ${pet.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePet(pet._id)
        }
      ]
    );
  };

  const deletePet = async (petId) => {
    try {
      setError('');
      await api.delete(`/pets/${petId}`);

      if (editingPetId === petId) {
        resetForm();
        setIsFormVisible(false);
      }

      await fetchPets();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Could not delete pet.'));
    }
  };

  const validateSearch = (searchValues = search) => {
    if (!isValidNonNegativeNumber(searchValues.minAge)) {
      return 'Minimum age must be a valid non-negative number.';
    }

    if (!isValidNonNegativeNumber(searchValues.maxAge)) {
      return 'Maximum age must be a valid non-negative number.';
    }

    if (
      searchValues.minAge.trim() &&
      searchValues.maxAge.trim() &&
      Number(searchValues.minAge) > Number(searchValues.maxAge)
    ) {
      return 'Minimum age cannot be greater than maximum age.';
    }

    return '';
  };

  const buildSearchParams = () => {
    const params = {};

    if (search.type) {
      params.type = search.type;
    }

    if (search.breed.trim()) {
      params.breed = search.breed.trim();
    }

    if (search.city.trim()) {
      params.city = search.city.trim();
    }

    if (search.minAge.trim()) {
      params.minAge = search.minAge.trim();
    }

    if (search.maxAge.trim()) {
      params.maxAge = search.maxAge.trim();
    }

    return params;
  };

  const handleSearch = async () => {
    const validationMessage = validateSearch();

    if (validationMessage) {
      setSearchError(validationMessage);
      return;
    }

    try {
      setError('');
      setSearchError('');
      setIsLoading(true);

      const { data } = await api.get('/pets/search', {
        params: buildSearchParams()
      });

      setPets(data.pets || []);
      setIsSearchActive(true);
    } catch (searchError) {
      setError(getErrorMessage(searchError, 'Could not search pets.'));
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = async () => {
    setSearch(initialSearch);
    setSearchError('');
    await fetchPets();
  };

  const isPetOwner = (pet) => getId(pet.owner) === getId(user);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchPets({ refreshing: true })}
          tintColor="#2f8f68"
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Pet profiles</Text>
          <Text style={styles.title}>My Pets</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={openCreateForm}>
          <Text style={styles.createButtonText}>Create Pet</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Search Pets</Text>
        <Text style={styles.searchHint}>
          Filter pets by type, breed, city, and age range.
        </Text>

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeGrid}>
          <TouchableOpacity
            style={[styles.typeChip, search.type === '' && styles.typeChipActive]}
            onPress={() => updateSearchField('type', '')}
          >
            <Text
              style={[
                styles.typeChipText,
                search.type === '' && styles.typeChipTextActive
              ]}
            >
              any
            </Text>
          </TouchableOpacity>
          {PET_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                search.type === type && styles.typeChipActive
              ]}
              onPress={() => updateSearchField('type', type)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  search.type === type && styles.typeChipTextActive
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Breed</Text>
        <TextInput
          value={search.breed}
          onChangeText={(value) => updateSearchField('breed', value)}
          placeholder="Golden Retriever"
          placeholderTextColor="#8a9b91"
          style={styles.input}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          value={search.city}
          onChangeText={(value) => updateSearchField('city', value)}
          placeholder="Tel Aviv"
          placeholderTextColor="#8a9b91"
          style={styles.input}
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Minimum age</Text>
            <TextInput
              value={search.minAge}
              onChangeText={(value) => updateSearchField('minAge', value)}
              placeholder="1"
              placeholderTextColor="#8a9b91"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Maximum age</Text>
            <TextInput
              value={search.maxAge}
              onChangeText={(value) => updateSearchField('maxAge', value)}
              placeholder="8"
              placeholderTextColor="#8a9b91"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        </View>

        {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}

        <View style={styles.searchActions}>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
            <Text style={styles.clearSearchButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isFormVisible ? (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingPetId ? 'Edit Pet' : 'Create Pet'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                resetForm();
                setIsFormVisible(false);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Bamba"
            placeholderTextColor="#8a9b91"
            style={styles.input}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {PET_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  form.type === type && styles.typeChipActive
                ]}
                onPress={() => updateField('type', type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    form.type === type && styles.typeChipTextActive
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Breed</Text>
          <TextInput
            value={form.breed}
            onChangeText={(value) => updateField('breed', value)}
            placeholder="Golden Retriever"
            placeholderTextColor="#8a9b91"
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                value={form.age}
                onChangeText={(value) => updateField('age', value)}
                placeholder="4"
                placeholderTextColor="#8a9b91"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>City</Text>
              <TextInput
                value={form.city}
                onChangeText={(value) => updateField('city', value)}
                placeholder="Tel Aviv"
                placeholderTextColor="#8a9b91"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={form.bio}
            onChangeText={(value) => updateField('bio', value)}
            placeholder="Friendly, curious, and loves long walks."
            placeholderTextColor="#8a9b91"
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Text style={styles.label}>Photo</Text>
          {form.imageUri ? (
            <Image source={{ uri: form.imageUri }} style={styles.formImagePreview} />
          ) : (
            <View style={styles.formImagePlaceholder}>
              <Text style={styles.formImagePlaceholderText}>No photo selected</Text>
            </View>
          )}
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoButton} onPress={choosePhoto}>
              <Text style={styles.photoButtonText}>Choose Photo</Text>
            </TouchableOpacity>
            {form.imageUri ? (
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => updateField('imageUri', '')}
              >
                <Text style={styles.removePhotoButtonText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? 'Saving...'
                : editingPetId
                  ? 'Save Changes'
                  : 'Add Pet'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2f8f68" />
          <Text style={styles.loadingText}>Loading your pets...</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {isSearchActive ? 'No matching pets found' : 'No pets yet'}
          </Text>
          <Text style={styles.emptyText}>
            {isSearchActive
              ? 'Try changing the filters or clear search to reload your pets.'
              : 'Create your first pet profile to start building your PetConnect family.'}
          </Text>
          {isSearchActive ? (
            <TouchableOpacity style={styles.emptyButton} onPress={clearSearch}>
              <Text style={styles.emptyButtonText}>Clear Search</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.emptyButton} onPress={openCreateForm}>
              <Text style={styles.emptyButtonText}>Create Pet</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.petList}>
          {pets.map((pet) => (
            <View key={pet._id} style={styles.petCard}>
              {pet.imageUri || pet.imageUrl ? (
                <Image source={{ uri: pet.imageUri || pet.imageUrl }} style={styles.petImage} />
              ) : (
                <View style={styles.petImagePlaceholder}>
                  <Text style={styles.petImagePlaceholderIcon}>PET</Text>
                  <Text style={styles.petImagePlaceholderText}>Pet photo</Text>
                </View>
              )}

              <View style={styles.petCardHeader}>
                <View>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petType}>{pet.type}</Text>
                </View>
                {isPetOwner(pet) ? (
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEditForm(pet)}>
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(pet)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <View style={styles.petDetails}>
                <Text style={styles.detailText}>Breed: {pet.breed || 'Not set'}</Text>
                <Text style={styles.detailText}>
                  Age: {pet.age === undefined || pet.age === null ? 'Not set' : pet.age}
                </Text>
                <Text style={styles.detailText}>City: {pet.city || 'Not set'}</Text>
              </View>

              {pet.bio ? <Text style={styles.bio}>{pet.bio}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fbf6'
  },
  content: {
    padding: 20,
    paddingBottom: 36
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 16
  },
  kicker: {
    color: '#2f8f68',
    fontWeight: '800',
    marginBottom: 4
  },
  title: {
    color: '#173b2c',
    fontSize: 28,
    fontWeight: '800'
  },
  createButton: {
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  error: {
    color: '#b3261e',
    lineHeight: 20,
    marginBottom: 12
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcebe1',
    marginBottom: 18
  },
  searchTitle: {
    color: '#173b2c',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6
  },
  searchHint: {
    color: '#5f7569',
    lineHeight: 21,
    marginBottom: 8
  },
  searchError: {
    color: '#b3261e',
    lineHeight: 20,
    marginTop: 10
  },
  searchActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  clearSearchButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  clearSearchButtonText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcebe1',
    marginBottom: 18
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  formTitle: {
    color: '#173b2c',
    fontSize: 20,
    fontWeight: '800'
  },
  cancelText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  label: {
    color: '#244536',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 10
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7e5dc',
    borderRadius: 8,
    color: '#173b2c',
    backgroundColor: '#fbfdfb',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  formImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#e6f2ea',
    marginBottom: 10
  },
  formImagePlaceholder: {
    height: 120,
    borderRadius: 8,
    backgroundColor: '#eef8f0',
    borderWidth: 1,
    borderColor: '#dcebe1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  formImagePlaceholderText: {
    color: '#5f7569',
    fontWeight: '800'
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  photoButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  removePhotoButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#b3261e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  removePhotoButtonText: {
    color: '#b3261e',
    fontWeight: '800'
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeChip: {
    borderWidth: 1,
    borderColor: '#cfe2d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#fbfdfb'
  },
  typeChipActive: {
    backgroundColor: '#2f8f68',
    borderColor: '#2f8f68'
  },
  typeChipText: {
    color: '#244536',
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  typeChipTextActive: {
    color: '#ffffff'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  rowItem: {
    flex: 1
  },
  submitButton: {
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  disabledButton: {
    opacity: 0.7
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  loadingText: {
    color: '#5f7569',
    marginTop: 12
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcebe1'
  },
  emptyTitle: {
    color: '#173b2c',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8
  },
  emptyText: {
    color: '#5f7569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16
  },
  emptyButton: {
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  petList: {
    gap: 12
  },
  petCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcebe1'
  },
  petImage: {
    width: '100%',
    height: 190,
    borderRadius: 8,
    backgroundColor: '#e6f2ea',
    marginBottom: 14
  },
  petImagePlaceholder: {
    height: 150,
    borderRadius: 8,
    backgroundColor: '#eef8f0',
    borderWidth: 1,
    borderColor: '#dcebe1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  petImagePlaceholderIcon: {
    color: '#2f8f68',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 4
  },
  petImagePlaceholderText: {
    color: '#5f7569',
    fontWeight: '800'
  },
  petCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12
  },
  petName: {
    color: '#173b2c',
    fontSize: 22,
    fontWeight: '800'
  },
  petType: {
    color: '#2f8f68',
    fontWeight: '800',
    textTransform: 'capitalize',
    marginTop: 2
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start'
  },
  editText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  deleteText: {
    color: '#b3261e',
    fontWeight: '800'
  },
  petDetails: {
    gap: 4,
    marginBottom: 10
  },
  detailText: {
    color: '#5f7569'
  },
  bio: {
    color: '#244536',
    lineHeight: 21
  }
});

