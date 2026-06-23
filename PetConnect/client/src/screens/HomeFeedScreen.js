import { useFocusEffect } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import { useCallback, useMemo, useState } from 'react';
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
import Svg, { Polyline } from 'react-native-svg';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const initialForm = {
  content: '',
  imageUri: '',
  videoUrl: '',
  group: ''
};

const initialSearch = {
  keyword: '',
  group: '',
  startDate: '',
  endDate: ''
};

const STICKER_VIEWBOX_WIDTH = 360;
const STICKER_VIEWBOX_HEIGHT = 320;

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const getId = (value) => {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value : value._id;
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return '';
  }

  return new Date(dateValue).toLocaleDateString();
};

const getStickerStrokes = (stickerData) => {
  if (!Array.isArray(stickerData)) {
    return [];
  }

  return stickerData.filter(
    (stroke) =>
      stroke &&
      Array.isArray(stroke.points) &&
      stroke.points.length > 0 &&
      typeof stroke.color === 'string'
  );
};

export default function HomeFeedScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [feedPosts, setFeedPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState(initialSearch);
  const [comments, setComments] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const fetchPosts = useCallback(async ({ refreshing = false } = {}) => {
    try {
      setError('');
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [feedResponse, myResponse, groupsResponse] = await Promise.all([
        api.get('/posts/feed'),
        api.get('/posts/my'),
        api.get('/groups/my')
      ]);

      setFeedPosts(feedResponse.data.posts || []);
      setMyPosts(myResponse.data.posts || []);
      setGroups(groupsResponse.data.groups || []);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Could not load posts.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const displayedPosts = useMemo(
    () => (activeTab === 'feed' ? feedPosts : myPosts),
    [activeTab, feedPosts, myPosts]
  );

  const updateFormField = (name, value) => {
    setFormError('');
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateSearchField = (name, value) => {
    setSearch((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingPostId(null);
    setFormError('');
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const openEditForm = (post) => {
    setForm({
      content: post.content || '',
      imageUri: post.imageUri || '',
      videoUrl: post.videoUrl || '',
      group: getId(post.group)
    });
    setEditingPostId(post._id);
    setIsFormVisible(true);
    setFormError('');
  };

  const validateForm = () => {
    if (!form.content.trim()) {
      return 'Post content is required.';
    }

    return '';
  };

  const buildPayload = () => ({
    content: form.content.trim(),
    imageUri: form.imageUri,
    videoUrl: form.videoUrl.trim() || undefined,
    group: form.group || undefined
  });

  const choosePhoto = async () => {
    try {
      setFormError('');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setFormError('Photo library permission is required to choose a post photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.canceled && result.assets?.length) {
        updateFormField('imageUri', result.assets[0].uri);
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

      if (editingPostId) {
        await api.put(`/posts/${editingPostId}`, buildPayload());
      } else {
        await api.post('/posts', buildPayload());
      }

      resetForm();
      setIsFormVisible(false);
      await fetchPosts();
    } catch (submitError) {
      setFormError(
        getErrorMessage(
          submitError,
          editingPostId ? 'Could not update post.' : 'Could not create post.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (post) => {
    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePost(post._id)
        }
      ]
    );
  };

  const deletePost = async (postId) => {
    try {
      setError('');
      await api.delete(`/posts/${postId}`);

      if (editingPostId === postId) {
        resetForm();
        setIsFormVisible(false);
      }

      await fetchPosts();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Could not delete post.'));
    }
  };

  const likePost = async (postId) => {
    try {
      setError('');
      await api.post(`/posts/${postId}/like`);
      await fetchPosts();
    } catch (likeError) {
      setError(getErrorMessage(likeError, 'Could not like post.'));
    }
  };

  const addComment = async (postId) => {
    const text = comments[postId]?.trim();

    if (!text) {
      setError('Comment text is required.');
      return;
    }

    try {
      setError('');
      await api.post(`/posts/${postId}/comment`, { text });
      setComments((current) => ({ ...current, [postId]: '' }));
      setExpandedComments((current) => ({ ...current, [postId]: true }));
      await fetchPosts();
    } catch (commentError) {
      setError(getErrorMessage(commentError, 'Could not add comment.'));
    }
  };

  const handleSearch = async () => {
    try {
      setError('');
      setIsLoading(true);

      const params = {};
      if (search.keyword.trim()) {
        params.keyword = search.keyword.trim();
      }
      if (search.group) {
        params.group = search.group;
      }
      if (search.startDate.trim()) {
        params.startDate = search.startDate.trim();
      }
      if (search.endDate.trim()) {
        params.endDate = search.endDate.trim();
      }

      const { data } = await api.get('/posts/search', { params });
      setFeedPosts(data.posts || []);
      setActiveTab('feed');
    } catch (searchError) {
      setError(getErrorMessage(searchError, 'Could not search posts.'));
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = async () => {
    setSearch(initialSearch);
    await fetchPosts();
  };

  const isAuthor = (post) => getId(post.author) === user?.id;

  const toggleComments = (postId) => {
    setExpandedComments((current) => ({
      ...current,
      [postId]: !current[postId]
    }));
  };

  const renderGroupPicker = (selectedValue, onSelect, includeAny = true) => (
    <View style={styles.chipGrid}>
      {includeAny ? (
        <TouchableOpacity
          style={[styles.chip, selectedValue === '' && styles.chipActive]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.chipText, selectedValue === '' && styles.chipTextActive]}>
            none
          </Text>
        </TouchableOpacity>
      ) : null}
      {groups.map((group) => (
        <TouchableOpacity
          key={group._id}
          style={[styles.chip, selectedValue === group._id && styles.chipActive]}
          onPress={() => onSelect(group._id)}
        >
          <Text
            style={[
              styles.chipText,
              selectedValue === group._id && styles.chipTextActive
            ]}
          >
            {group.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPostCard = (post) => {
    const authorName =
      typeof post.author === 'object' ? post.author.username : 'Unknown author';
    const groupName = typeof post.group === 'object' ? post.group.name : '';
    const petName = typeof post.pet === 'object' ? post.pet.name : '';
    const currentUserIsAuthor = isAuthor(post);
    const postComments = post.comments || [];
    const commentsAreOpen = !!expandedComments[post._id];
    const stickerStrokes = getStickerStrokes(post.stickerData);

    return (
      <View key={post._id} style={styles.postCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.author}>{authorName}</Text>
            <Text style={styles.meta}>
              {groupName ? `${groupName} - ` : ''}
              {formatDate(post.createdAt)}
            </Text>
          </View>

          {currentUserIsAuthor ? (
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEditForm(post)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(post)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <Text style={styles.contentText}>{post.content}</Text>

        {petName ? (
          <View style={styles.petStoryTag}>
            <Text style={styles.petStoryTagText}>Story with {petName}</Text>
          </View>
        ) : null}

        {post.imageUri || post.imageUrl ? (
          <Image source={{ uri: post.imageUri || post.imageUrl }} style={styles.postImage} />
        ) : null}

        {post.videoUri ? (
          <View style={styles.postVideoFrame}>
            <Video
              source={{ uri: post.videoUri }}
              style={styles.postVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          </View>
        ) : null}

        {!post.videoUri && post.videoUrl ? (
          <View style={styles.videoBox}>
            <Text style={styles.videoLabel}>Video</Text>
            <Text style={styles.videoUrl}>{post.videoUrl}</Text>
          </View>
        ) : null}

        {stickerStrokes.length ? (
          <View style={styles.stickerPreview}>
            <Text style={styles.stickerTitle}>Pet Sticker</Text>
            <Svg
              width="100%"
              height={130}
              viewBox={`0 0 ${STICKER_VIEWBOX_WIDTH} ${STICKER_VIEWBOX_HEIGHT}`}
            >
              {stickerStrokes.map((stroke, index) => (
                <Polyline
                  key={`${post._id}-sticker-${index}`}
                  points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Text style={styles.statText}>{post.likes?.length || 0} likes</Text>
          <TouchableOpacity onPress={() => toggleComments(post._id)}>
            <Text style={styles.commentToggleText}>
              {commentsAreOpen ? 'Hide' : 'View'} {postComments.length} comment
              {postComments.length === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        </View>

        {commentsAreOpen ? (
          <View style={styles.commentsPanel}>
            {postComments.length ? (
              postComments.map((comment) => {
                const commenterName =
                  typeof comment.user === 'object' ? comment.user.username : 'PetConnect user';

                return (
                  <View key={comment._id} style={styles.commentItem}>
                    <Text style={styles.commentAuthor}>{commenterName}</Text>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noCommentsText}>No comments yet. Be the first to reply.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.lightButton} onPress={() => likePost(post._id)}>
            <Text style={styles.lightButtonText}>Like</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.commentBox}>
          <TextInput
            value={comments[post._id] || ''}
            onChangeText={(value) =>
              setComments((current) => ({ ...current, [post._id]: value }))
            }
            placeholder="Add a comment"
            placeholderTextColor="#8a9b91"
            style={styles.commentInput}
          />
          <TouchableOpacity style={styles.commentButton} onPress={() => addComment(post._id)}>
            <Text style={styles.commentButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchPosts({ refreshing: true })}
          tintColor="#2f8f68"
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Hello, {user?.username}</Text>
          <Text style={styles.title}>PetConnect Feed</Text>
          <Text style={styles.subtitle}>Share updates, follow group posts, and cheer each other on.</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.primaryButton} onPress={openCreateForm}>
          <Text style={styles.primaryButtonText}>Create Post</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setIsSearchVisible((visible) => !visible)}
        >
          <Text style={styles.secondaryButtonText}>
            {isSearchVisible ? 'Hide Search' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            My Posts
          </Text>
        </TouchableOpacity>
      </View>

      {isSearchVisible ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Search posts</Text>
          <TextInput
            value={search.keyword}
            onChangeText={(value) => updateSearchField('keyword', value)}
            placeholder="Keyword"
            placeholderTextColor="#8a9b91"
            style={styles.input}
          />
          <Text style={styles.label}>Group</Text>
          {renderGroupPicker(search.group, (value) => updateSearchField('group', value))}
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Start date</Text>
              <TextInput
                value={search.startDate}
                onChangeText={(value) => updateSearchField('startDate', value)}
                placeholder="2026-01-01"
                placeholderTextColor="#8a9b91"
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>End date</Text>
              <TextInput
                value={search.endDate}
                onChangeText={(value) => updateSearchField('endDate', value)}
                placeholder="2026-12-31"
                placeholderTextColor="#8a9b91"
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.searchActions}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {isFormVisible ? (
        <View style={styles.panel}>
          <View style={styles.formHeader}>
            <Text style={styles.panelTitle}>
              {editingPostId ? 'Edit Post' : 'Create Post'}
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

          <Text style={styles.label}>Content</Text>
          <TextInput
            value={form.content}
            onChangeText={(value) => updateFormField('content', value)}
            placeholder="What did your pet do today?"
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
                onPress={() => updateFormField('imageUri', '')}
              >
                <Text style={styles.removePhotoButtonText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.label}>Video URL</Text>
          <TextInput
            value={form.videoUrl}
            onChangeText={(value) => updateFormField('videoUrl', value)}
            placeholder="https://example.com/video.mp4"
            placeholderTextColor="#8a9b91"
            style={styles.input}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Group</Text>
          {renderGroupPicker(form.group, (value) => updateFormField('group', value))}

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? 'Saving...'
                : editingPostId
                  ? 'Save Changes'
                  : 'Publish Post'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2f8f68" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : displayedPosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            Join groups or publish a post to start filling your PetConnect feed.
          </Text>
        </View>
      ) : (
        <View style={styles.postList}>{displayedPosts.map(renderPostCard)}</View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fbf6'
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 36
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dcebe1'
  },
  headerText: {
    marginBottom: 14
  },
  kicker: {
    color: '#2f8f68',
    fontWeight: '800',
    marginBottom: 6
  },
  title: {
    color: '#173b2c',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8
  },
  subtitle: {
    color: '#5f7569',
    lineHeight: 22
  },
  error: {
    color: '#b3261e',
    lineHeight: 20,
    marginBottom: 12
  },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e6f2ea',
    borderRadius: 8,
    padding: 4,
    marginBottom: 14
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  tabActive: {
    backgroundColor: '#ffffff'
  },
  tabText: {
    color: '#5f7569',
    fontWeight: '800'
  },
  tabTextActive: {
    color: '#173b2c'
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcebe1',
    marginBottom: 16
  },
  panelTitle: {
    color: '#173b2c',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
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
    minHeight: 94,
    textAlignVertical: 'top'
  },
  formImagePreview: {
    width: '100%',
    height: 190,
    borderRadius: 8,
    backgroundColor: '#e6f2ea',
    marginBottom: 10
  },
  formImagePlaceholder: {
    height: 128,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cfe2d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#fbfdfb'
  },
  chipActive: {
    backgroundColor: '#2f8f68',
    borderColor: '#2f8f68'
  },
  chipText: {
    color: '#244536',
    fontWeight: '700'
  },
  chipTextActive: {
    color: '#ffffff'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  rowItem: {
    flex: 1
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
  clearButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  clearButtonText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  submitButton: {
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14
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
    lineHeight: 22
  },
  postList: {
    gap: 12
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcebe1'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10
  },
  cardTitleWrap: {
    flex: 1
  },
  author: {
    color: '#173b2c',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 3
  },
  meta: {
    color: '#5f7569',
    fontSize: 13
  },
  actions: {
    flexDirection: 'row',
    gap: 12
  },
  editText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  deleteText: {
    color: '#b3261e',
    fontWeight: '800'
  },
  contentText: {
    color: '#244536',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 12
  },
  petStoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef8f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcebe1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10
  },
  petStoryTagText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  postImage: {
    width: '100%',
    height: 190,
    borderRadius: 8,
    backgroundColor: '#e6f2ea',
    marginBottom: 12
  },
  postVideoFrame: {
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#173b2c',
    marginBottom: 12
  },
  postVideo: {
    width: '100%',
    height: '100%'
  },
  videoBox: {
    borderWidth: 1,
    borderColor: '#d7e5dc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fbfdfb'
  },
  videoLabel: {
    color: '#2f8f68',
    fontWeight: '800',
    marginBottom: 4
  },
  videoUrl: {
    color: '#244536'
  },
  stickerPreview: {
    backgroundColor: '#fbfdfb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcebe1',
    padding: 12,
    marginBottom: 12
  },
  stickerTitle: {
    color: '#2f8f68',
    fontWeight: '800',
    marginBottom: 8
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10
  },
  statText: {
    color: '#5f7569',
    fontWeight: '700'
  },
  commentToggleText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  commentsPanel: {
    backgroundColor: '#fbfdfb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcebe1',
    padding: 12,
    marginBottom: 12,
    gap: 10
  },
  commentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#edf4ef',
    paddingBottom: 10
  },
  commentAuthor: {
    color: '#173b2c',
    fontWeight: '800',
    marginBottom: 3
  },
  commentText: {
    color: '#244536',
    lineHeight: 21
  },
  commentDate: {
    color: '#8a9b91',
    fontSize: 12,
    marginTop: 5
  },
  noCommentsText: {
    color: '#5f7569',
    lineHeight: 21
  },
  postActions: {
    flexDirection: 'row',
    marginBottom: 12
  },
  lightButton: {
    borderWidth: 1,
    borderColor: '#2f8f68',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9
  },
  lightButtonText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  commentBox: {
    flexDirection: 'row',
    gap: 8
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7e5dc',
    borderRadius: 8,
    color: '#173b2c',
    backgroundColor: '#fbfdfb',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  commentButton: {
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  commentButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
