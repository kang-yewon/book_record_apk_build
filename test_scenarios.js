// Automated test script to verify all user requirements and scenarios
import {
  saveBookReview,
  getBooks,
  getReviews,
  getBookById,
  getReviewsByBookId,
  deleteReview,
  areTitlesAndAuthorsMatching
} from './src/storage.js';

// Mock localStorage for Node environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- Starting 독서록 Core Requirement Tests ---');

// Setup: clear storage
localStorage.clear();

// Test 1: 서로 다른 작가의 같은 제목 & 누적 & 최신순
console.log('\n[테스트 1] 서로 다른 작가의 같은 제목 & 누적');
// 1. 최영의 『변신』 첫 번째 독후감
const res1 = saveBookReview({
  title: '변신',
  author: '최영',
  readingDate: '2026-10-01',
  content: '최영의 변신 첫 번째 독후감'
});
const choiId = res1.book.id;

// 2. 아이린의 『변신』 독후감
const res2 = saveBookReview({
  title: '변신',
  author: '아이린',
  readingDate: '2026-10-03',
  content: '아이린의 변신 독후감'
});
const ireneId = res2.book.id;

// 3. 최영의 『변신』 두 번째 독후감 추가 (공백이 들어가도 동일 책으로 인식되는지 테스트)
const res3 = saveBookReview({
  title: ' 변신 ',
  author: '  최영 ',
  readingDate: '2026-10-05',
  content: '최영의 변신 두 번째 독후감'
});

const booksTest1 = getBooks();
assert(booksTest1.length === 2, `책은 총 2권이어야 함 (실제: ${booksTest1.length})`);
assert(booksTest1[0].id === choiId, `최신 독후감이 추가된 최영의 『변신』이 홈 화면 1위여야 함`);
assert(booksTest1[1].id === ireneId, `아이린의 『변신』이 2위여야 함`);

const choiReviews = getReviewsByBookId(choiId);
const ireneReviews = getReviewsByBookId(ireneId);
assert(choiReviews.length === 2, `최영의 『변신』 독후감은 2개여야 함 (실제: ${choiReviews.length})`);
assert(ireneReviews.length === 1, `아이린의 『변신』 독후감은 1개여야 함 (실제: ${ireneReviews.length})`);
assert(choiReviews[0].content === '최영의 변신 두 번째 독후감', '가장 최근에 작성된 독후감이 상단에 표시되어야 함');

// Test 2: 기존 독후감 삭제 (독후감이 여러 개인 책)
console.log('\n[테스트 2] 독후감이 여러 개인 책에서 1개 삭제');
const reviewToDelete = choiReviews[1].id; // 첫 번째 독후감
const delRes1 = deleteReview(reviewToDelete);
assert(!delRes1.bookDeleted, '책은 삭제되지 않아야 함');
assert(delRes1.remainingCount === 1, '남은 독후감 수는 1개여야 함');

const choiRemaining = getReviewsByBookId(choiId);
assert(choiRemaining.length === 1, '남은 독후감 목록 길이가 1이어야 함');
assert(choiRemaining[0].content === '최영의 변신 두 번째 독후감', '남은 독후감은 두 번째 독후감이어야 함');
assert(getBooks().length === 2, '책 목록은 여전히 2권 유지되어야 함');

// Test 3: 마지막 독후감 삭제
console.log('\n[테스트 3] 마지막 독후감 삭제 (책 기록도 함께 삭제)');
const ireneRevId = ireneReviews[0].id;
const delRes2 = deleteReview(ireneRevId);
assert(delRes2.bookDeleted, '마지막 독후감 삭제 시 책도 삭제되어야 함');
assert(getBooks().length === 1, '책 목록에 최영의 『변신』 1권만 남아야 함');
assert(getBooks()[0].id === choiId, '최영의 『변신』은 아무 영향 없이 유지되어야 함');
assert(getBookById(ireneId) === null, '아이린의 『변신』 책 정보는 조회되지 않아야 함');

// Test 4: 삭제한 책 다시 기록하기
console.log('\n[테스트 4] 삭제한 책 다시 기록');
const res4 = saveBookReview({
  title: '변신',
  author: '아이린',
  readingDate: '2026-10-14',
  content: '아이린의 새로운 독후감'
});
assert(res4.book.id !== ireneId, '새로운 책 고유 ID가 생성되어야 함');
const newIreneReviews = getReviewsByBookId(res4.book.id);
assert(newIreneReviews.length === 1, '새로운 책에는 오직 새 독후감 1개만 있어야 함 (이전 삭제 기록 복구 안 됨)');
assert(newIreneReviews[0].content === '아이린의 새로운 독후감', '새 독후감 본문 일치');

// Test 5: 검색 기능
console.log('\n[테스트 5] 검색 기능');
const searchByAuthorChoi = getBooks().filter(b => b.author.includes('최영'));
assert(searchByAuthorChoi.length === 1 && searchByAuthorChoi[0].title === '변신', '작가 검색 성공');
const searchByTitle = getBooks().filter(b => b.title.includes('변신'));
assert(searchByTitle.length === 2, '제목 검색 시 서로 다른 작가의 책 2권 모두 검색됨');

// Test 6: 최신순 정렬 규칙
console.log('\n[테스트 6] 최신순 정렬 규칙');
// 최영의 『변신』에 새로운 독후감 추가
saveBookReview({
  title: '변신',
  author: '최영',
  readingDate: '2026-09-01', // 과거 날짜로 독서했더라도
  content: '오늘 새로 추가한 최영 변신 3번째 독후감'
});
const sortedBooks = getBooks();
assert(sortedBooks[0].author === '최영', '과거 독서 날짜라도 오늘 저장한 책이 최신순 1위가 됨');

// Test 7: 앱 데이터 유지
console.log('\n[테스트 7] 앱 데이터 유지');
const rawBooks = localStorage.getItem('book_record_books');
const rawReviews = localStorage.getItem('book_record_reviews');
assert(rawBooks !== null && rawReviews !== null, 'localStorage에 데이터가 정상 직렬화되어 보관됨');

// Test 8: 별점 시스템 (5점 만점)
console.log('\n[테스트 8] 별점 시스템 (5점 만점)');
const resRating = saveBookReview({
  title: '어린왕자',
  author: '생텍쥐페리',
  rating: 4,
  readingDate: '2026-10-15',
  content: '어른들을 위한 동화'
});
assert(resRating.review.rating === 4, '별점 4점이 정상 저장되어야 함');
const littlePrinceReviews = getReviewsByBookId(resRating.book.id);
assert(littlePrinceReviews[0].rating === 4, '조회된 독후감 별점이 4점이어야 함');

console.log('\n🎉 ALL SCENARIOS INCL. STAR RATING PASSED PERFECTLY!\n');
