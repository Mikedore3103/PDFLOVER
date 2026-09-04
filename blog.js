const POSTS = [
  { slug: 'prepare-pdfs-before-sharing', category: 'Workflows', title: 'A calmer way to prepare PDFs before you share them', excerpt: 'A short pre-send routine can keep drafts, permissions, filenames, and page order from becoming someone else’s problem.', date: '2026-08-28', readTime: '5 min read', image: 'assets/blog/pdf-workspace.png', content: ['A file can be technically finished and still feel unfinished to the person receiving it. Before sharing a PDF, pause for one small review: check the filename, page order, and whether the document opens the way you expect.', 'Keep your working copy separate from the version you send. That gives you a safe place to make changes later, while the shared version stays clear and easy to identify.', 'Finally, imagine opening the file for the first time. If the title, first page, and page order answer the obvious questions, your document is ready to travel.'] },
  { slug: 'tables-that-survive-export', category: 'Productivity', title: 'How to make tables easier to reuse after a PDF export', excerpt: 'Simple source-document choices make it much easier to recover clean rows and columns when a spreadsheet needs another life.', date: '2026-08-19', readTime: '6 min read', image: 'assets/blog/data-desk.png', content: ['Tables work best when each column has one clear job. Keep headings short, avoid combining several ideas in one cell, and use consistent number formats before exporting.', 'Wide gaps, merged cells, and decorative lines may look nice in a PDF, but they can make reusable data harder to recognise. A simpler source table is usually easier to read and easier to move later.', 'When you need the information in a spreadsheet again, review the first few rows after conversion. A quick check early is much easier than repairing a large table at the end.'] },
  { slug: 'merge-without-losing-order', category: 'PDF Basics', title: 'Merge documents without losing the story they are meant to tell', excerpt: 'A reliable naming and ordering habit makes multi-file packets easier to review, navigate, and hand over.', date: '2026-08-11', readTime: '4 min read', image: 'assets/blog/editorial-desk.png', content: ['A merged PDF should read like one helpful document, not a pile of files joined together. Decide the order before uploading anything: cover page, key information, supporting pages, then appendices.', 'Numbered filenames make this easy. Names such as 01-overview, 02-agreement, and 03-receipts tell both you and the tool exactly where each file belongs.', 'After merging, scan the first and last page of every section. This tiny check catches missing files, upside-down pages, and accidental duplicates before someone else finds them.'] },
  { slug: 'small-files-clear-documents', category: 'PDF Basics', title: 'Smaller files do not have to mean less clear documents', excerpt: 'Learn where compression helps, what to inspect afterwards, and when an original should stay untouched.', date: '2026-08-03', readTime: '5 min read', image: 'assets/blog/pdf-workspace.png', content: ['Large PDFs are often difficult to email, upload, and open on a phone. Compression can help, especially when a document contains many large photographs or scanned pages.', 'Always keep the original before making a smaller copy. Then inspect the compressed file at normal reading size. Look closely at small text, signatures, diagrams, and images with fine detail.', 'If the smaller file is still easy to read, it is ready to share. If important details look soft or broken, return to the original and choose a gentler compression level.'] },
  { slug: 'password-protection-practical', category: 'Security', title: 'Password protection is useful when the rest of the workflow is clear', excerpt: 'Choose a shareable password process, protect the right copy, and avoid locking yourself out of an important file.', date: '2026-07-25', readTime: '5 min read', image: 'assets/blog/editorial-desk.png', content: ['A password can protect a private PDF, but it also creates a new job: making sure the right person can open it. Use a password that is strong, but choose a safe way to share it separately from the file.', 'Protect a copy, not the only version of your document. Keep an original in a secure place so you can make updates without depending on an old password.', 'Before sending the file, try opening it yourself with the password. This confirms the document still works and helps you spot a typing mistake before it reaches someone else.'] },
  { slug: 'cleaner-review-packets', category: 'Workflows', title: 'Build cleaner review packets for teams that work asynchronously', excerpt: 'The right page order, filenames, and conversion choices give reviewers context before the first comment arrives.', date: '2026-07-16', readTime: '7 min read', image: 'assets/blog/data-desk.png', content: ['When people review documents at different times, context matters. Start with one short page that explains what the packet is, what needs attention, and when feedback is needed.', 'Group related pages together and use familiar labels. A reviewer should not have to guess whether a spreadsheet belongs before or after the report that explains it.', 'Before sending, open the final packet on a small screen as well as a large one. If the important instructions are easy to find in both places, the review will start more smoothly.'] },
  { slug: 'pdf-to-word-expectations', category: 'Productivity', title: 'What to expect when you turn a PDF into an editable document', excerpt: 'Text-based PDFs can travel well into an editable format; scans and intricate layouts need a more deliberate plan.', date: '2026-07-08', readTime: '6 min read', image: 'assets/blog/pdf-workspace.png', content: ['A PDF is designed to keep a page looking the same. An editable document is designed to let words and objects move. Turning one into the other works best when the PDF started as clean, selectable text.', 'Simple letters, reports, and lists often convert well. Scanned pages, unusual fonts, and very detailed layouts may need a little cleanup after conversion.', 'Treat the converted document as a useful working copy. Read through it, correct any small layout changes, and keep the original PDF nearby whenever exact visual reference matters.'] },
  { slug: 'split-large-pdf', category: 'PDF Basics', title: 'Split a long PDF into useful, easy-to-find sections', excerpt: 'Break a large document at natural decision points so people can find the part they need without extra searching.', date: '2026-06-27', readTime: '4 min read', image: 'assets/blog/editorial-desk.png', content: ['A long PDF becomes easier to use when it is divided at natural stopping points. Think about the question a reader is trying to answer, then make that section easy to find.', 'Use clear filenames for each new part. A label such as invoice-pages-1-to-5 is more helpful than a name full of random numbers.', 'After splitting, count the pages in each new file and make sure no page has been left behind. Small checks like this keep a simple task from becoming a confusing one.'] }
];

const root = document.getElementById('blogRoot');
const params = new URLSearchParams(window.location.search);
const category = params.get('category') || '';
const articleSlug = params.get('article');
const currentPage = Math.max(1, Number(params.get('page')) || 1);
const perPage = 4;

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function linkFor(updates = {}) {
  const next = new URLSearchParams();
  const values = { category, page: currentPage, ...updates };
  if (values.category) next.set('category', values.category);
  if (values.article) next.set('article', values.article);
  if (!values.article && values.page > 1) next.set('page', values.page);
  return `blog.html${next.toString() ? `?${next}` : ''}`;
}

function categories() { return [...new Set(POSTS.map(post => post.category))]; }

function postMarkup(post, compact = false) {
  if (compact) return `<li><a class="popular-post" href="${linkFor({ article: post.slug })}"><img src="${post.image}" alt="" loading="lazy"><span><strong>${post.title}</strong><small>${formatDate(post.date)}</small></span></a></li>`;
  return `<article class="post-list-item">
    <a class="post-image" href="${linkFor({ article: post.slug })}"><img src="${post.image}" alt="Editorial image for ${post.title}" loading="lazy"></a>
    <div class="post-copy"><a class="post-category" href="${linkFor({ category: post.category, page: 1 })}">${post.category}</a>
      <h2><a href="${linkFor({ article: post.slug })}">${post.title}</a></h2><p>${post.excerpt}</p>
      <div class="post-meta"><time datetime="${post.date}">${formatDate(post.date)}</time><span aria-hidden="true">•</span><span>${post.readTime}</span></div>
    </div>
  </article>`;
}

function sidebarMarkup(filteredPosts) {
  const popular = [...filteredPosts].slice(0, 4);
  return `<aside class="blog-sidebar" aria-label="Document Desk sidebar">
    <section class="sidebar-about"><img src="assets/blog/editorial-desk.png" alt="A tidy editorial desk with documents" loading="lazy"><p class="section-kicker">The PDF LOVERS desk</p><h2>Useful habits for document work</h2><p>Practical notes from the team behind PDF LOVERS—made for clearer files and calmer handoffs.</p><a class="sidebar-link" href="index.html#tools">Explore the tools <i data-lucide="arrow-up-right" aria-hidden="true"></i></a></section>
    <section class="sidebar-module"><h2>Latest notes</h2><ol class="popular-list">${popular.map(post => postMarkup(post, true)).join('')}</ol></section>
    <section class="sidebar-module"><h2>Browse topics</h2><div class="tag-cloud">${categories().map(item => `<a href="${linkFor({ category: item, page: 1 })}">${item}</a>`).join('')}</div></section>
  </aside>`;
}

function paginationMarkup(pageCount) {
  if (pageCount < 2) return '';
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return `<nav class="blog-pagination" aria-label="Article pages"><a class="pagination-arrow ${currentPage === 1 ? 'is-disabled' : ''}" ${currentPage === 1 ? 'aria-disabled="true"' : `href="${linkFor({ page: currentPage - 1 })}"`} aria-label="Previous page"><i data-lucide="arrow-left" aria-hidden="true"></i></a>${pages.map(page => `<a href="${linkFor({ page })}" ${page === currentPage ? 'aria-current="page"' : ''}>${String(page).padStart(2, '0')}</a>`).join('')}<a class="pagination-arrow ${currentPage === pageCount ? 'is-disabled' : ''}" ${currentPage === pageCount ? 'aria-disabled="true"' : `href="${linkFor({ page: currentPage + 1 })}"`} aria-label="Next page"><i data-lucide="arrow-right" aria-hidden="true"></i></a></nav>`;
}

function renderArchive() {
  const filtered = category ? POSTS.filter(post => post.category === category) : POSTS;
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Math.min(currentPage, pageCount);
  const items = filtered.slice((page - 1) * perPage, page * perPage);
  root.innerHTML = `<section class="blog-heading container"><p class="blog-breadcrumb"><a href="index.html">Home</a><span>/</span><span>Document Desk</span>${category ? `<span>/</span><span>${category}</span>` : ''}</p><h1>${category || 'Document Desk'}</h1><p>${category ? `Guidance and practical ideas for ${category.toLowerCase()}.` : 'Guidance for turning busy documents into clear, shareable work.'}</p></section>
    <div class="container blog-layout"><section class="post-list" aria-label="Articles">${items.length ? items.map(post => postMarkup(post)).join('') : '<p class="empty-state">No articles are available in this topic yet.</p>'}${paginationMarkup(pageCount)}</section>${sidebarMarkup(POSTS)}</div>`;
}

function renderArticle(post) {
  if (!post) { window.history.replaceState({}, '', 'blog.html'); renderArchive(); return; }
  root.innerHTML = `<section class="article-shell container"><p class="blog-breadcrumb"><a href="blog.html">Document Desk</a><span>/</span><a href="${linkFor({ category: post.category, page: 1 })}">${post.category}</a></p><article class="article-detail"><p class="post-category">${post.category}</p><h1>${post.title}</h1><div class="post-meta"><time datetime="${post.date}">${formatDate(post.date)}</time><span aria-hidden="true">•</span><span>${post.readTime}</span></div><img src="${post.image}" alt="Editorial image for ${post.title}"><p class="article-lead">${post.excerpt}</p>${post.content.map(paragraph => `<p>${paragraph}</p>`).join('')}<a class="article-back" href="${linkFor({ article: null })}"><i data-lucide="arrow-left" aria-hidden="true"></i> Back to Document Desk</a></article></section>`;
}

function renderFooterCategories() {
  document.getElementById('blogFooterCategories').innerHTML = categories().map(item => `<li><a href="${linkFor({ category: item, page: 1 })}">${item}</a></li>`).join('');
  document.getElementById('blogYear').textContent = new Date().getFullYear();
}

renderFooterCategories();
if (articleSlug) {
  renderArticle(POSTS.find(post => post.slug === articleSlug));
} else {
  renderArchive();
}
if (window.lucide) window.lucide.createIcons();
