// Data storage management for '독서록' (Book Reading Journal)
const STORAGE_KEYS = {
  BOOKS: 'book_record_books',
  REVIEWS: 'book_record_reviews',
  DRAFT: 'book_record_draft'
};

// Normalize string for accurate matching (trim whitespace and normalize)
export function normalizeText(str) {
  if (!str) return '';
  return str.trim();
}

export function areTitlesAndAuthorsMatching(title1, author1, title2, author2) {
  return normalizeText(title1).toLowerCase() === normalizeText(title2).toLowerCase() &&
         normalizeText(author1).toLowerCase() === normalizeText(author2).toLowerCase();
}

let lastTimestamp = 0;
function getMonotonicIsoString() {
  let now = Date.now();
  if (now <= lastTimestamp) {
    now = lastTimestamp + 1;
  }
  lastTimestamp = now;
  return new Date(now).toISOString();
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getBooks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKS);
    const books = raw ? JSON.parse(raw) : [];
    // Sort books by updatedAt descending (most recently updated/reviewed book first)
    return books.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error('Failed to load books:', err);
    return [];
  }
}

export function saveBooks(books) {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  } catch (err) {
    console.error('Failed to save books:', err);
  }
}

export function getReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load reviews:', err);
    return [];
  }
}

export function saveReviews(reviews) {
  try {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  } catch (err) {
    console.error('Failed to save reviews:', err);
  }
}

export function getBookById(bookId) {
  const books = getBooks();
  return books.find(b => b.id === bookId) || null;
}

export function getReviewsByBookId(bookId) {
  const reviews = getReviews();
  const bookReviews = reviews.filter(r => r.bookId === bookId);
  // Sort reverse chronological by review creation timestamp (newest first)
  return bookReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function findExistingBook(title, author) {
  const books = getBooks();
  return books.find(b => areTitlesAndAuthorsMatching(b.title, b.author, title, author)) || null;
}

/**
 * Saves a new review. If the book (title + author) already exists,
 * appends review to the existing book and updates its updatedAt timestamp.
 * If new, creates a new book record.
 */
export function saveBookReview({ title, author, rating = 5, readingDate, content }) {
  const cleanTitle = normalizeText(title);
  const cleanAuthor = normalizeText(author);
  const cleanContent = content ? content.trim() : '';
  const parsedRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
  const now = getMonotonicIsoString();

  if (!cleanTitle || !cleanAuthor || !cleanContent) {
    throw new Error('필수 입력 항목(책 제목, 작가, 독후감 본문)을 모두 입력해주세요.');
  }

  let books = getBooks();
  let reviews = getReviews();

  // Find if matching book exists
  let targetBook = books.find(b => areTitlesAndAuthorsMatching(b.title, b.author, cleanTitle, cleanAuthor));

  if (targetBook) {
    // Existing book: update latest review timestamp
    targetBook.updatedAt = now;
  } else {
    // New book record
    targetBook = {
      id: generateId('book'),
      title: cleanTitle,
      author: cleanAuthor,
      createdAt: now,
      updatedAt: now
    };
    books.push(targetBook);
  }

  // Create review
  const newReview = {
    id: generateId('rev'),
    bookId: targetBook.id,
    rating: parsedRating,
    readingDate: readingDate || now.split('T')[0],
    content: cleanContent,
    createdAt: now
  };
  reviews.push(newReview);

  // Save both
  saveBooks(books);
  saveReviews(reviews);

  return {
    book: targetBook,
    review: newReview
  };
}

/**
 * Deletes a review.
 * If this was the last review for the book, also deletes the book completely!
 * Returns { bookDeleted: boolean, remainingCount: number }
 */
export function deleteReview(reviewId) {
  let reviews = getReviews();
  let books = getBooks();

  const targetReview = reviews.find(r => r.id === reviewId);
  if (!targetReview) {
    return { bookDeleted: false, remainingCount: 0 };
  }

  const bookId = targetReview.bookId;

  // Remove the review
  reviews = reviews.filter(r => r.id !== reviewId);
  saveReviews(reviews);

  // Check remaining reviews for this book
  const remainingReviews = reviews.filter(r => r.bookId === bookId);

  if (remainingReviews.length === 0) {
    // Delete the book entirely
    books = books.filter(b => b.id !== bookId);
    saveBooks(books);
    return { bookDeleted: true, remainingCount: 0 };
  } else {
    // Update book's updatedAt to the newest remaining review's createdAt
    remainingReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex !== -1) {
      books[bookIndex].updatedAt = remainingReviews[0].createdAt;
      saveBooks(books);
    }
    return { bookDeleted: false, remainingCount: remainingReviews.length };
  }
}

// Temporary Draft Management
export function getDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function saveDraft(draft) {
  try {
    if (!draft || (!draft.title && !draft.author && !draft.content && !draft.rating)) {
      clearDraft();
    } else {
      localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
    }
  } catch (err) {
    console.error('Failed to save draft:', err);
  }
}

export function clearDraft() {
  localStorage.removeItem(STORAGE_KEYS.DRAFT);
}
