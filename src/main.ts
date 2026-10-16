import { charts, chartFromPath, matches } from './catalog';
import type { Chart } from './catalog';
import { icon } from './icons';
import './styles.css';

const repository = 'https://github.com/Hhhkarimi/nemoodarestan';
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application container is missing');
const root: HTMLDivElement = app;
const fa = new Intl.NumberFormat('fa-IR');
const escape = (value: string): string => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
const brand = (): string => '<a class="brand" href="/" aria-label="نمودارستان، صفحهٔ اصلی"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>نمودارستان</a>';
const route = (chart: Chart): string => `/studio/${chart.id}`;

function guideMarkup(): string {
  return `<dialog id="guide" aria-labelledby="guide-title"><div class="dialog-header"><h2 id="guide-title">کدام نمودار به دادهٔ شما می‌آید؟</h2><button class="icon-button" id="close-guide" aria-label="بستن راهنما">${icon('close')}</button></div><div class="guide-content"><p>اول داستانی را که داده‌هایتان می‌گویند انتخاب کنید.</p><div class="guide-options">${charts.map(chart => `<a class="guide-option" href="${route(chart)}"><span><strong>${escape(chart.useCase)}</strong><small>${escape(chart.inputs)}</small></span><span>${escape(chart.title)} ${icon('arrow')}</span></a>`).join('')}</div><div class="guide-footnote">هر ویرایشگر با دادهٔ نمونه باز می‌شود. ابتدا آن را امتحان کنید، سپس داده‌هایتان را وارد کنید و از بخش خروجی، تصویر بگیرید.</div></div></dialog>`;
}
function bindGuide(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#guide');
  let opener: HTMLButtonElement | undefined;
  if (!dialog) return;
  document.querySelectorAll<HTMLButtonElement>('[data-guide]').forEach(button => button.addEventListener('click', () => { opener = button; dialog.showModal(); }));
  document.querySelector('#close-guide')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }
  });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
}
function card(chart: Chart): string {
  return `<article class="chart-card"><a class="chart-preview" href="${route(chart)}" aria-label="ساخت نمودار ${escape(chart.title)}"><img src="${chart.preview}" width="600" height="324" alt="پیش‌نمایش نمودار ${escape(chart.title)} با دادهٔ نمونه" loading="eager"/><span class="preview-corner">${icon('arrowUp',16)}</span></a><div class="card-heading"><h3>${escape(chart.title)}</h3><span class="english-title" lang="en">${escape(chart.englishTitle)}</span></div><p>${escape(chart.description)}</p><div class="card-bottom"><a class="text-link" href="${route(chart)}">ساخت نمودار ${icon('arrow',18)}</a><span class="chart-formats" aria-label="قالب‌های خروجی">${chart.formats.join(' · ')}</span></div></article>`;
}
function gallery(): void {
  document.title = 'نمودارستان — داده‌ها، دیدنی می‌شوند';
  root.innerHTML = `<header class="site-header"><div class="container header-inner">${brand()}<nav class="header-nav" aria-label="منوی اصلی"><a class="nav-library" href="#catalog" aria-current="page">نمودارها</a><button data-guide>${icon('book')}<span class="wide-label">راهنمای انتخاب</span><span class="narrow-label">راهنما</span></button><a href="${repository}" target="_blank" rel="noopener noreferrer" aria-label="کد نمودارستان در گیت‌هاب">${icon('github')}<span class="source-label">گیت‌هاب</span></a></nav></div></header>
  <main id="main" class="container"><section class="intro" aria-labelledby="intro-title"><div><h1 id="intro-title">داده‌ها، <span>دیدنی می‌شوند.</span></h1><p>یک نمودار متفاوت انتخاب کنید.<br/>داده‌های خودتان را وارد کنید و به تصویر بکشید.</p></div><aside class="intro-note">${icon('shield',22)}<div><strong>داده‌های شما، پیش خودتان.</strong><p>ساخت و ویرایش نمودار در مرورگر شما انجام می‌شود. بدون حساب کاربری و بارگذاری داده روی سرور.</p><button data-guide>برای شروع کمک می‌خواهید؟ ${icon('arrow',16)}</button></div></aside></section>
  <section id="catalog" aria-labelledby="catalog-title"><div class="catalog-heading"><h2 id="catalog-title">کتابخانهٔ نمودارها</h2><span class="catalog-count">${fa.format(charts.length)} ابزار، آمادهٔ ساخت</span></div><div class="discovery-bar"><div class="filters" role="group" aria-label="دسته‌بندی نمودارها"><button class="filter" data-filter="all" aria-pressed="true">همهٔ نمودارها</button>${Array.from(new Map(charts.map(c => [c.category,c.categoryLabel]))).map(([id,label]) => `<button class="filter" data-filter="${id}" aria-pressed="false">${escape(label)}</button>`).join('')}</div><label class="search">${icon('search')}<span class="sr-only">جست‌وجوی نام یا کاربرد نمودار</span><input type="search" id="search" placeholder="نام نمودار یا کاربرد آن…" autocomplete="off"/><kbd class="search-key" aria-hidden="true">/</kbd></label></div><p id="result-status" class="sr-only" role="status" aria-live="polite"></p><div id="chart-grid" class="chart-grid">${charts.map(card).join('')}</div><div class="empty-state" id="empty" hidden><h3>نموداری با این مشخصات پیدا نشد.</h3><p>نام دیگری را امتحان کنید یا همهٔ نمودارها را ببینید.</p><button class="button" id="clear-search">نمایش همهٔ نمودارها ${icon('arrow')}</button></div></section>
  <section class="about-strip" aria-labelledby="about-title"><div><h2 id="about-title">این کتابخانه، بزرگ‌تر می‌شود.</h2><p>نمودارستان خانهٔ ابزارهای فارسی مصورسازی داده است. کد آن در دسترس است؛ می‌توانید نمودار تازه‌ای پیشنهاد دهید یا در ساخت آن مشارکت کنید.</p></div><a class="text-link" href="${repository}/issues/new" target="_blank" rel="noopener noreferrer">پیشنهاد یک نمودار ${icon('arrowUp')}</a></section>
  <section class="faq" aria-labelledby="faq-title"><h2 id="faq-title">پیش از اولین نمودار</h2><div class="faq-list"><details><summary>برای شروع، فایل داده لازم دارم؟</summary><p>خیر. همهٔ ابزارها با دادهٔ نمونه باز می‌شوند. می‌توانید همان داده‌ها را ویرایش کنید یا از بخش ورود داده، فایل خودتان را وارد کنید. فرمت‌های قابل ورود در هر ابزار مشخص شده‌اند.</p></details><details><summary>خروجی برای گزارش و شبکه‌های اجتماعی مناسب است؟</summary><p>بله. همهٔ ابزارها خروجی SVG و PNG دارند. برای تصویر مقیاس‌پذیر از SVG و برای اسلاید یا انتشار تصویر از PNG استفاده کنید. اندازه و فونت را در خود ویرایشگر تنظیم کنید.</p></details><details><summary>داده‌هایم کجا ذخیره می‌شوند؟</summary><p>داده‌ها در مرورگر شما پردازش می‌شوند و برای ساخت نمودار به سرور ارسال نمی‌شوند. نگهداری خودکار به مرورگر و ابزار بستگی دارد؛ برای ادامهٔ کار، فایل پروژه را از داخل ویرایشگر ذخیره کنید. ذخیره‌های سایت‌های قبلی به این دامنه منتقل نمی‌شوند.</p></details></div></section></main>
  <footer class="site-footer"><div class="container footer-inner"><span>نمودارستان · از داده تا تصویر، به فارسی</span><a href="https://github.com/Hhhkarimi" target="_blank" rel="noopener noreferrer">ساختهٔ Hhhkarimi ${icon('arrowUp',14)}</a></div></footer>${guideMarkup()}`;
  let category = 'all';
  const search = document.querySelector<HTMLInputElement>('#search')!;
  const grid = document.querySelector<HTMLDivElement>('#chart-grid')!;
  const empty = document.querySelector<HTMLDivElement>('#empty')!;
  const sync = (): void => {
    const filtered = charts.filter(chart => matches(chart, search.value, category));
    grid.innerHTML = filtered.map(card).join('');
    grid.hidden = filtered.length === 0;
    empty.hidden = filtered.length !== 0;
    document.querySelector('#result-status')!.textContent = `${fa.format(filtered.length)} نمودار پیدا شد`;
    const params = new URLSearchParams();
    if (search.value) params.set('q',search.value);
    if (category !== 'all') params.set('category',category);
    const query = params.toString();
    history.replaceState(null,'',`${location.pathname}${query ? '?' + query : ''}${location.hash}`);
  };
  const setFilter = (next: string): void => {
    category = next;
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.filter === category)));
    sync();
  };
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter!)));
  search.addEventListener('input',sync);
  document.querySelector('#clear-search')?.addEventListener('click', () => { search.value = ''; setFilter('all'); search.focus(); });
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') ?? '';
  const initialCategory = params.get('category');
  if (initialCategory && charts.some(chart => chart.category === initialCategory)) category = initialCategory;
  setFilter(category);
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.key === '/' && !(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement) && !document.querySelector('dialog[open]')) { event.preventDefault(); search.focus(); }
  });
  bindGuide();
}
function workspace(chart: Chart): void {
  document.title = `${chart.title} | نمودارستان`;
  root.innerHTML = `<main id="main" class="workspace"><header class="workspace-header"><div class="workspace-start">${brand()}<span class="workspace-divider" aria-hidden="true"></span><label><span class="sr-only">انتخاب نمودار</span><select class="studio-select" id="studio-select">${charts.map(item => `<option value="${item.id}" ${item.id === chart.id ? 'selected' : ''}>${escape(item.title)}</option>`).join('')}</select></label></div><nav class="workspace-actions" aria-label="کنترل ویرایشگر"><a class="text-link" href="/">${icon('back',16)} کتابخانه</a><button class="icon-button" data-guide aria-label="راهنمای انتخاب نمودار">${icon('book',17)}</button><a class="icon-button" href="${chart.entry}" target="_blank" rel="noopener" aria-label="باز کردن مستقل ویرایشگر">${icon('external',17)}</a></nav></header><section class="editor-stage" aria-label="ویرایشگر ${escape(chart.title)}"><div class="editor-loading" id="editor-loading" role="status"><div class="loading-line" aria-hidden="true"></div><strong>ویرایشگر ${escape(chart.title)} آماده می‌شود…</strong><p>دادهٔ نمونه برای شروع در دسترس شماست.</p></div><div class="editor-error" id="editor-error" hidden role="alert"><strong>ویرایشگر باز نشد.</strong><p>اتصال را بررسی کنید و دوباره تلاش کنید.</p><button class="button" id="retry">تلاش دوباره</button><a class="text-link" href="/">بازگشت به کتابخانه ${icon('arrow')}</a></div><iframe class="editor-frame" id="editor-frame" allow="fullscreen" allowfullscreen title="ویرایشگر نمودار ${escape(chart.title)}" src="${chart.entry}"></iframe></section></main>${guideMarkup()}`;
  document.querySelector('#studio-select')?.addEventListener('change', event => {
    const next = charts.find(item => item.id === (event.target as HTMLSelectElement).value);
    if (next) location.assign(route(next));
  });
  const frame = document.querySelector<HTMLIFrameElement>('#editor-frame')!;
  const loading = document.querySelector<HTMLDivElement>('#editor-loading')!;
  const error = document.querySelector<HTMLDivElement>('#editor-error')!;
  let timer: ReturnType<typeof setTimeout>;
  const failed = (): void => { loading.hidden = true; error.hidden = false; };
  const arm = (): void => { timer = setTimeout(failed,45000); };
  frame.addEventListener('load', () => {
    clearTimeout(timer);
    try {
      const doc = frame.contentDocument;
      if (!doc || (!doc.querySelector('#app') && !doc.querySelector('#root'))) { failed(); return; }
      loading.hidden = true;
      error.hidden = true;
    } catch { failed(); }
  });
  frame.addEventListener('error',failed);
  document.querySelector('#retry')?.addEventListener('click', () => { clearTimeout(timer); error.hidden = true; loading.hidden = false; frame.src = chart.entry; arm(); });
  arm();
  bindGuide();
}
const chart = chartFromPath(location.pathname);
if (chart) workspace(chart);
else if (location.pathname === '/') gallery();
else {
  document.title = 'صفحه پیدا نشد | نمودارستان';
  root.innerHTML = `<main id="main" class="not-found"><h1>این نمودار را پیدا نکردیم.</h1><p>از کتابخانه، یکی از نمودارهای موجود را انتخاب کنید.</p><a class="button primary" href="/">بازگشت به کتابخانه ${icon('arrow')}</a></main>`;
}
