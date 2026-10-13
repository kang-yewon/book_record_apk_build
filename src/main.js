import './style.css';
import {
  getBooks,
  getBookById,
  getReviewsByBookId,
  saveBookReview,
  deleteReview,
  getDraft,
  saveDraft,
  clearDraft
} from './storage.js';

// Application State
const state = {
  currentView: 'home', // 'home' | 'write' | 'detail'
  selectedBookId: null,
  searchQuery: '',
  currentPage: 1,
  pageSize: 6, // 2 cols x 3 rows grid
  modal: null // { type: 'select_review' | 'confirm_delete', ... }
};

const appContainer = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');

// Toast helper
function showToast(message) {
  const existing = document.querySelector('.app-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// Modal helper: cleanly close and remove modal DOM
function closeModal() {
  state.modal = null;
  if (modalRoot) {
    modalRoot.innerHTML = '';
  }
}

// Navigation
function navigateTo(view, bookId = null) {
  state.currentView = view;
  if (bookId) {
    state.selectedBookId = bookId;
  }
  closeModal();
  render();
  window.scrollTo(0, 0);
}

// Main Render Dispatcher
function render() {
  appContainer.innerHTML = '';
  if (modalRoot) {
    modalRoot.innerHTML = '';
  }

  if (state.currentView === 'home') {
    renderHome();
  } else if (state.currentView === 'write') {
    renderWrite();
  } else if (state.currentView === 'detail') {
    renderDetail();
  }

  // Render modal if open
  if (state.modal) {
    renderModal();
  }
}

// ==========================================
// 1. HOME SCREEN (3. 홈 화면)
// ==========================================
function renderHome() {
  const homeView = document.createElement('div');
  homeView.className = 'view';

  // 3-1 Top Search Bar
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  searchContainer.innerHTML = `
    <div class="search-input-wrap">
      <span class="search-icon">🔍</span>
      <input type="text"
             class="search-input"
             id="search-input-field"
             placeholder="책 제목이나 작가를 검색해보세요"
             value="${escapeHtml(state.searchQuery)}" />
      <button class="search-clear-btn" id="search-clear-btn" aria-label="검색어 지우기" style="display: ${state.searchQuery ? 'flex' : 'none'};">✕</button>
    </div>
  `;
  homeView.appendChild(searchContainer);

  // 3-2 & 3-3 Recent Books Grid (2 cols x 3 rows = 6 items per page)
  const gridWrapper = document.createElement('div');
  gridWrapper.className = 'books-grid-wrapper';
  homeView.appendChild(gridWrapper);

  // Isolated grid update function: never destroys search input DOM or dismisses keyboard!
  const updateHomeGrid = () => {
    const allBooks = getBooks();
    const q = state.searchQuery.trim().toLowerCase();
    const filteredBooks = q
      ? allBooks.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      : allBooks;

    const totalPages = Math.ceil(filteredBooks.length / state.pageSize) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const currentBooks = filteredBooks.slice(startIndex, startIndex + state.pageSize);

    gridWrapper.innerHTML = '';

    if (filteredBooks.length === 0) {
      gridWrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📖</div>
          <div class="empty-state-text">${q ? '일치하는 독서 기록이 없습니다.' : '아직 작성된 독서록이 없습니다.'}</div>
          <div class="empty-state-sub">${q ? '책 제목이나 작가 이름을 다시 확인해보세요.' : '아래 기록 버튼을 눌러 첫 독후감을 남겨보세요.'}</div>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'books-grid';

    currentBooks.forEach(book => {
      const card = document.createElement('div');
      card.className = 'book-card';
      card.innerHTML = `
        <div class="card-title">${escapeHtml(book.title)}</div>
        <div class="card-author">${escapeHtml(book.author)}</div>
      `;
      card.addEventListener('click', () => {
        navigateTo('detail', book.id);
      });
      grid.appendChild(card);
    });

    gridWrapper.appendChild(grid);

    // Pagination if > 6 books
    if (totalPages > 1) {
      const pagination = document.createElement('div');
      pagination.className = 'pagination-controls';
      pagination.innerHTML = `
        <button class="page-btn" id="prev-page-btn" ${state.currentPage <= 1 ? 'disabled' : ''}>◀ 이전</button>
        <span class="page-info">${state.currentPage} / ${totalPages}</span>
        <button class="page-btn" id="next-page-btn" ${state.currentPage >= totalPages ? 'disabled' : ''}>다음 ▶</button>
      `;

      pagination.querySelector('#prev-page-btn')?.addEventListener('click', () => {
        if (state.currentPage > 1) {
          state.currentPage--;
          updateHomeGrid();
        }
      });

      pagination.querySelector('#next-page-btn')?.addEventListener('click', () => {
        if (state.currentPage < totalPages) {
          state.currentPage++;
          updateHomeGrid();
        }
      });

      gridWrapper.appendChild(pagination);
    }
  };

  const searchInput = searchContainer.querySelector('#search-input-field');
  const clearBtn = searchContainer.querySelector('#search-clear-btn');

  // Input event: updates search results and clear button without losing focus or closing keyboard
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    state.currentPage = 1;
    clearBtn.style.display = state.searchQuery ? 'flex' : 'none';
    updateHomeGrid();
  });

  // Clear button click: clears input and maintains focus
  clearBtn.addEventListener('click', () => {
    state.searchQuery = '';
    searchInput.value = '';
    state.currentPage = 1;
    clearBtn.style.display = 'none';
    searchInput.focus();
    updateHomeGrid();
  });

  // Initial grid population
  updateHomeGrid();

  // 3-4 Bottom Record Button
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';
  bottomBar.innerHTML = `
    <button class="btn-primary-pink" id="write-record-btn">
      <span>✏️</span> 독후감 기록
    </button>
  `;
  bottomBar.querySelector('#write-record-btn').addEventListener('click', () => {
    navigateTo('write');
  });

  homeView.appendChild(bottomBar);
  appContainer.appendChild(homeView);
}

// ==========================================
// 2. WRITE SCREEN (4. 새로운 독후감 작성 페이지)
// ==========================================
function renderWrite() {
  const writeView = document.createElement('div');
  writeView.className = 'view';

  // Top Nav
  const topNav = document.createElement('div');
  topNav.className = 'top-nav';
  topNav.innerHTML = `
    <button class="nav-btn" id="back-to-home-btn" aria-label="뒤로가기">←</button>
    <div class="nav-title">독후감 쓰기</div>
    <div style="width: 36px;"></div>
  `;
  topNav.querySelector('#back-to-home-btn').addEventListener('click', () => {
    navigateTo('home');
  });
  writeView.appendChild(topNav);

  // Form Container
  const form = document.createElement('div');
  form.className = 'write-form';

  const today = new Date().toISOString().split('T')[0];
  const draft = getDraft() || {};

  if (draft.title || draft.author || draft.content) {
    const draftNotice = document.createElement('div');
    draftNotice.className = 'draft-toast';
    draftNotice.innerHTML = `
      <span>📝 임시 저장된 내용을 불러왔습니다.</span>
      <button class="draft-clear-btn" id="clear-draft-btn">새로 쓰기</button>
    `;
    draftNotice.querySelector('#clear-draft-btn').addEventListener('click', () => {
      clearDraft();
      render();
    });
    form.appendChild(draftNotice);
  }

  form.innerHTML += `
    <div class="form-group">
      <label class="form-label" for="book-title">책 제목</label>
      <input type="text" id="book-title" class="form-input" placeholder="책 제목을 입력해주세요" value="${escapeHtml(draft.title || '')}" />
    </div>

    <div class="form-group">
      <label class="form-label" for="book-author">작가</label>
      <input type="text" id="book-author" class="form-input" placeholder="작가 이름을 입력해주세요" value="${escapeHtml(draft.author || '')}" />
    </div>

    <div class="form-group">
      <label class="form-label" for="reading-date">독서 날짜</label>
      <input type="date" id="reading-date" class="form-input" value="${draft.readingDate || today}" />
    </div>

    <div class="form-group" style="flex: 1; display: flex; flex-direction: column;">
      <label class="form-label" for="review-content">독후감</label>
      <textarea id="review-content" class="form-textarea" placeholder="책을 읽고 느낀 생각, 인상 깊었던 구절 등을 자유롭게 기록해보세요.">${escapeHtml(draft.content || '')}</textarea>
    </div>
  `;

  // Auto-save draft on user typing
  const updateDraft = () => {
    const title = form.querySelector('#book-title').value;
    const author = form.querySelector('#book-author').value;
    const readingDate = form.querySelector('#reading-date').value;
    const content = form.querySelector('#review-content').value;
    saveDraft({ title, author, readingDate, content });
  };

  form.querySelector('#book-title').addEventListener('input', updateDraft);
  form.querySelector('#book-author').addEventListener('input', updateDraft);
  form.querySelector('#reading-date').addEventListener('change', updateDraft);
  form.querySelector('#review-content').addEventListener('input', updateDraft);

  writeView.appendChild(form);

  // 4-4 Bottom Save Button
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';
  bottomBar.innerHTML = `
    <button class="btn-primary-pink" id="save-review-btn">
      저장
    </button>
  `;

  bottomBar.querySelector('#save-review-btn').addEventListener('click', () => {
    const title = form.querySelector('#book-title').value.trim();
    const author = form.querySelector('#book-author').value.trim();
    const readingDate = form.querySelector('#reading-date').value;
    const content = form.querySelector('#review-content').value.trim();

    if (!title) {
      showToast('책 제목을 입력해주세요.');
      form.querySelector('#book-title').focus();
      return;
    }
    if (!author) {
      showToast('작가 이름을 입력해주세요.');
      form.querySelector('#book-author').focus();
      return;
    }
    if (!content) {
      showToast('독후감 본문을 입력해주세요.');
      form.querySelector('#review-content').focus();
      return;
    }

    try {
      const result = saveBookReview({ title, author, readingDate, content });
      clearDraft();
      showToast('독후감이 저장되었습니다.');
      // Navigate to the book's reading page
      navigateTo('detail', result.book.id);
    } catch (err) {
      showToast(err.message || '저장 중 오류가 발생했습니다.');
    }
  });

  writeView.appendChild(bottomBar);
  appContainer.appendChild(writeView);
}

// ==========================================
// 3. DETAIL SCREEN (6. 독후감 열람 페이지)
// ==========================================
function renderDetail() {
  const detailView = document.createElement('div');
  detailView.className = 'view';

  const book = getBookById(state.selectedBookId);
  if (!book) {
    showToast('해당 책 정보를 찾을 수 없습니다.');
    navigateTo('home');
    return;
  }

  const reviews = getReviewsByBookId(book.id);

  // Top Nav
  const topNav = document.createElement('div');
  topNav.className = 'top-nav';
  topNav.innerHTML = `
    <button class="nav-btn" id="back-btn" aria-label="목록으로">←</button>
    <div class="nav-title">독서록 열람</div>
    <button class="nav-btn" id="delete-btn" aria-label="삭제하기" style="font-size: 1.25rem;">⛔</button>
  `;

  topNav.querySelector('#back-btn').addEventListener('click', () => {
    navigateTo('home');
  });

  // 7. 독후감 삭제 기능 trigger
  topNav.querySelector('#delete-btn').addEventListener('click', () => {
    if (reviews.length === 1) {
      // 7-2 독후감이 하나뿐인 책: 책 기록도 함께 삭제됨 안내
      state.modal = {
        type: 'confirm_delete',
        reviewId: reviews[0].id,
        isLast: true,
        message: '이 독후감을 삭제할까요?\n삭제한 기록은 복구할 수 없습니다.\n\n(책의 마지막 독후감으로, 책 기록도 함께 삭제됩니다.)'
      };
      renderModal();
    } else {
      // 7-1 독후감이 여러 개인 책: 삭제할 독후감 선택 UI 표시
      state.modal = {
        type: 'select_review',
        bookId: book.id,
        reviews: reviews
      };
      renderModal();
    }
  });

  detailView.appendChild(topNav);

  // 6-1 Upper Header (책 제목 크게, 작가 이름 작게)
  const header = document.createElement('div');
  header.className = 'detail-header';
  header.innerHTML = `
    <div class="detail-title">${escapeHtml(book.title)}</div>
    <div class="detail-author">${escapeHtml(book.author)}</div>
  `;
  detailView.appendChild(header);

  // 6-2 & 6-4 독후감 목록 (최신순 역순 정렬)
  const list = document.createElement('div');
  list.className = 'reviews-list';

  reviews.forEach((rev, index) => {
    // 독후감 N 번호 계산 (가장 최신 독후감이 가장 높은 번호)
    const reviewNumber = reviews.length - index;

    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-card-header">
        <span class="review-number-tag">독후감 ${reviewNumber}</span>
        <span class="review-date">독서 날짜: ${escapeHtml(rev.readingDate)}</span>
      </div>
      <div class="review-body">${escapeHtml(rev.content)}</div>
    `;
    list.appendChild(card);
  });

  detailView.appendChild(list);
  appContainer.appendChild(detailView);
}

// ==========================================
// 4. DELETE MODALS (7. 독후감 삭제 기능)
// ==========================================
function renderModal() {
  if (!modalRoot) return;
  modalRoot.innerHTML = '';
  if (!state.modal) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const content = document.createElement('div');
  content.className = 'modal-content';

  if (state.modal.type === 'select_review') {
    // 7-1 삭제할 독후감 선택 화면
    content.innerHTML = `
      <div class="modal-title">삭제할 독후감 선택</div>
      <div class="modal-subtitle">삭제하고자 하는 독후감을 목록에서 선택해주세요.</div>
      <div class="modal-select-list" id="modal-select-list"></div>
      <div class="modal-actions">
        <button class="modal-btn btn-secondary" id="modal-cancel-btn">취소</button>
      </div>
    `;

    const selectList = content.querySelector('#modal-select-list');
    state.modal.reviews.forEach((rev, index) => {
      const reviewNumber = state.modal.reviews.length - index;
      const snippet = rev.content.replace(/\n/g, ' ').substring(0, 50);

      const item = document.createElement('div');
      item.className = 'modal-select-item';
      item.innerHTML = `
        <div class="select-item-top">
          <span class="select-item-num">독후감 ${reviewNumber}</span>
          <span class="select-item-date">${escapeHtml(rev.readingDate)}</span>
        </div>
        <div class="select-item-snippet">${escapeHtml(snippet || '(내용 없음)')}</div>
      `;

      item.addEventListener('click', () => {
        // Open confirmation for selected review
        state.modal = {
          type: 'confirm_delete',
          reviewId: rev.id,
          isLast: false,
          reviewNumber: reviewNumber,
          message: `독후감 ${reviewNumber}을(를) 삭제할까요?\n삭제한 기록은 복구할 수 없습니다.`
        };
        renderModal();
      });

      selectList.appendChild(item);
    });

    content.querySelector('#modal-cancel-btn').addEventListener('click', () => {
      closeModal();
    });

  } else if (state.modal.type === 'confirm_delete') {
    // 7-3 삭제 확인 창
    content.innerHTML = `
      <div class="modal-title" style="color: var(--danger-color);">독후감 삭제 확인</div>
      <div class="modal-subtitle" style="white-space: pre-line;">${escapeHtml(state.modal.message)}</div>
      <div class="modal-actions">
        <button class="modal-btn btn-secondary" id="modal-cancel-btn">취소</button>
        <button class="modal-btn btn-danger" id="modal-confirm-delete-btn">삭제</button>
      </div>
    `;

    content.querySelector('#modal-cancel-btn').addEventListener('click', () => {
      closeModal();
    });

    content.querySelector('#modal-confirm-delete-btn').addEventListener('click', () => {
      const result = deleteReview(state.modal.reviewId);
      closeModal();

      if (result.bookDeleted) {
        showToast('책과 독후감이 모두 삭제되었습니다.');
        navigateTo('home');
      } else {
        showToast('선택한 독후감이 삭제되었습니다.');
        render();
      }
    });
  }

  // Click outside to cancel
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  overlay.appendChild(content);
  modalRoot.appendChild(overlay);
}

// Security Helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial Launch
render();
