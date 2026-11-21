/* ===== WSMUD2 攻略 · 多级目录 + 按需加载 ===== */
(function () {
    /* 正文里的自定义标签：ws-p 还原为段落，ws-source 还原为页底 */
    if (!customElements.get('ws-p')) {
        customElements.define('ws-p', class extends HTMLElement {
            connectedCallback() {
                const p = document.createElement('p');
                p.className = 'ws-p';
                while (this.firstChild) p.appendChild(this.firstChild);
                this.replaceWith(p);
            }
        });
    }
    if (!customElements.get('ws-source')) {
        customElements.define('ws-source', class extends HTMLElement {
            connectedCallback() {
                const p = document.createElement('p');
                p.className = 'ws-source';
                p.appendChild(document.createTextNode('内容整理自飞书《武神MUD2手册》· '));
                const a = document.createElement('a');
                a.href = this.getAttribute('href') || '';
                a.target = '_blank';
                a.rel = 'noopener';
                a.textContent = '查看原文';
                p.appendChild(a);
                this.replaceWith(p);
            }
        });
    }

    const navEl = document.getElementById('ws-nav');
    const contentEl = document.getElementById('ws-content');
    const titleEl = document.getElementById('ws-doc-title');
    const eyebrowEl = document.getElementById('ws-eyebrow');
    const sidebarEl = document.querySelector('.ws-sidebar');
    const mainEl = document.querySelector('.ws-main');
    const menuToggle = document.getElementById('ws-menu-toggle');

    const NAV_GAP = 22;
    let requiredSidebar = 400;

    const cache = new Map();
    const meta = new Map(); // slug -> { title, group, link }
    let loadSeq = 0;
    let currentSlug = null;

    const skeleton = '<div class="ws-skeleton" aria-hidden="true"><span></span><span></span><span></span><span></span></div>';

    function slugFromHash() {
        const raw = location.hash.replace(/^#\/?/, '').trim();
        return raw || 'home';
    }

    function buildLevel(entries, container, groupTitle) {
        entries.forEach(function (entry) {
            const node = document.createElement('div');
            node.className = 'ws-nav-entry';
            const hasChildren = entry.children && entry.children.length;
            const showChildren = hasChildren && !entry.hideChildren;
            const row = document.createElement('div');
            row.className = 'ws-nav-row';

            if (showChildren) {
                node.classList.add('is-collapsed');
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'ws-nav-toggle';
                toggle.setAttribute('aria-label', '展开或收起 ' + entry.title);
                toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
                toggle.addEventListener('click', function () {
                    node.classList.toggle('is-collapsed');
                });
                row.appendChild(toggle);
            } else {
                const spacer = document.createElement('span');
                spacer.className = 'ws-nav-spacer';
                row.appendChild(spacer);
            }

            const link = document.createElement('a');
            link.className = 'ws-nav-item';
            link.href = '#/' + entry.slug;
            link.dataset.slug = entry.slug;
            link.textContent = entry.title;
            row.appendChild(link);
            node.appendChild(row);
            meta.set(entry.slug, { title: entry.title, group: groupTitle, link: link, path: entry.path });

            if (hasChildren) {
                if (showChildren) {
                    const children = document.createElement('div');
                    children.className = 'ws-nav-children';
                    buildLevel(entry.children, children, groupTitle);
                    node.appendChild(children);
                } else {
                    registerHidden(entry.children, groupTitle);
                }
            }

            container.appendChild(node);
        });
    }

    function registerHidden(entries, groupTitle) {
        entries.forEach(function (entry) {
            meta.set(entry.slug, { title: entry.title, group: groupTitle, link: null, path: entry.path });
            if (entry.children && entry.children.length) registerHidden(entry.children, groupTitle);
        });
    }

    function buildNav(nav) {
        navEl.innerHTML = '';
        const frag = document.createDocumentFragment();
        buildLevel(nav, frag, null);
        navEl.appendChild(frag);
        // 顶层分组的眉标使用自身名称，嵌套页使用所属顶层名称
        nav.forEach(function (entry) {
            const info = meta.get(entry.slug);
            if (info) info.group = entry.title;
            bubbleGroup(entry, entry.title);
        });
    }

    function bubbleGroup(entry, groupTitle) {
        (entry.children || []).forEach(function (child) {
            const info = meta.get(child.slug);
            if (info) info.group = groupTitle;
            bubbleGroup(child, groupTitle);
        });
    }

    function setActive(slug) {
        navEl.querySelectorAll('.ws-nav-item').forEach(function (el) {
            const on = el.dataset.slug === slug;
            el.classList.toggle('is-active', on);
            if (el.parentElement) el.parentElement.classList.toggle('is-active', on);
        });
        const active = navEl.querySelector('.ws-nav-item.is-active');
        if (!active) return;

        // 展开当前章节的所有父级
        let parent = active.closest('.ws-nav-children');
        while (parent) {
            const node = parent.parentElement;
            if (node && node.classList.contains('is-collapsed')) {
                node.classList.remove('is-collapsed');
            }
            parent = node && node.parentElement ? node.parentElement.closest('.ws-nav-children') : null;
        }

        if (navEl.scrollHeight > navEl.clientHeight) {
            const delta = active.getBoundingClientRect().top - navEl.getBoundingClientRect().top;
            navEl.scrollTop += delta - navEl.clientHeight / 2 + active.clientHeight / 2;
        }
    }

    async function loadPage(slug) {
        if (slug === currentSlug) return;
        const seq = ++loadSeq;
        currentSlug = slug;
        closeMenu();
        setActive(slug);

        const info = meta.get(slug);
        eyebrowEl.textContent = info && info.group ? info.group : '武神MUD2手册';
        titleEl.textContent = info ? info.title : 'WSMUD2 攻略';

        const cached = cache.get(slug);
        if (!cached) contentEl.innerHTML = skeleton;

        try {
            let html = cached;
            if (!html) {
                const relative = info && info.path ? info.path : slug;
                const res = await fetch('content/' + relative + '.html');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                html = await res.text();
                cache.set(slug, html);
            }
            if (seq !== loadSeq) return;

            contentEl.innerHTML = html;
            titleEl.textContent = info ? info.title : slug;
            document.title = (info ? info.title : slug) + ' · WSMUD2 攻略';
            window.scrollTo({ top: 0, behavior: 'auto' });
        } catch (err) {
            if (seq !== loadSeq) return;
            contentEl.innerHTML = '<div class="ws-error">章节加载失败：' + (err.message || '未知错误') +
                '<br>请检查网络后重试，或返回 <a href="#/home">手册首页</a>。</div>';
            console.error('[ws] load failed:', slug, err);
        }
    }

    function closeMenu() {
        document.body.classList.remove('is-menu-open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    }

    function measureSidebarWidth() {
        const collapsed = Array.prototype.slice.call(navEl.querySelectorAll('.ws-nav-entry.is-collapsed'));
        collapsed.forEach(function (n) { n.classList.remove('is-collapsed'); });

        const links = Array.prototype.slice.call(navEl.querySelectorAll('.ws-nav-item'));
        links.forEach(function (a) { a.style.whiteSpace = 'nowrap'; });

        const navLeft = navEl.getBoundingClientRect().left;
        let widest = 0;
        links.forEach(function (a) {
            const need = (a.getBoundingClientRect().left - navLeft) + a.scrollWidth;
            if (need > widest) widest = need;
        });

        links.forEach(function (a) { a.style.whiteSpace = ''; });
        collapsed.forEach(function (n) { n.classList.add('is-collapsed'); });

        const navStyle = getComputedStyle(navEl);
        const navExtra = (parseFloat(navStyle.paddingRight) || 0) + 10;
        const brand = document.querySelector('.ws-brand');
        const brandWidth = brand ? brand.scrollWidth + 12 : 0;
        return Math.ceil(Math.max(widest + navExtra, brandWidth) + 34);
    }

    function applyLayout() {
        const vw = document.documentElement.clientWidth;
        const pad = vw <= 960 ? 28 : 48;
        const available = Math.min(1620, vw - pad);
        const quarter = (available - NAV_GAP) / 4;
        const width = Math.max(requiredSidebar, quarter);
        const content = available - NAV_GAP - width;
        const bubble = width >= content;

        document.body.classList.toggle('ws-bubble-mode', bubble);
        closeMenu();

        if (bubble) {
            sidebarEl.style.width = '';
            sidebarEl.style.left = '';
            mainEl.style.marginLeft = '';
        } else {
            sidebarEl.style.width = Math.round(width) + 'px';
            sidebarEl.style.left = Math.round((vw - available) / 2) + 'px';
            mainEl.style.marginLeft = Math.round(width + NAV_GAP) + 'px';
        }
    }

    async function init() {
        try {
            const res = await fetch('manifest.json');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const manifest = await res.json();
            document.title = manifest.title + ' · WSMUD2 攻略';
            buildNav(manifest.nav);
        } catch (err) {
            navEl.innerHTML = '<div class="ws-nav-loading">目录加载失败</div>';
            contentEl.innerHTML = '<div class="ws-error">攻略目录加载失败：' + (err.message || '未知错误') + '</div>';
            return;
        }

        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (e) { /* 忽略字体等待失败 */ }
        }
        requiredSidebar = measureSidebarWidth();
        applyLayout();

        if (menuToggle) {
            menuToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                const open = document.body.classList.toggle('is-menu-open');
                menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }
        navEl.addEventListener('click', function (e) {
            if (e.target.closest('a')) closeMenu();
        });
        document.addEventListener('click', function (e) {
            if (!document.body.classList.contains('ws-bubble-mode')) return;
            if (!document.body.classList.contains('is-menu-open')) return;
            if (sidebarEl.contains(e.target) || (menuToggle && menuToggle.contains(e.target))) return;
            closeMenu();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });
        let rafId = 0;
        window.addEventListener('resize', function () {
            if (rafId) return;
            rafId = requestAnimationFrame(function () {
                rafId = 0;
                applyLayout();
            });
        });

        const slug = slugFromHash();
        if (!meta.has(slug)) {
            contentEl.innerHTML = '<div class="ws-error">未找到章节「' + slug.replace(/[<>&"]/g, '') +
                '」，请从左侧目录选择，或返回 <a href="#/home">手册首页</a>。</div>';
            return;
        }
        loadPage(slug);
    }

    window.addEventListener('hashchange', function () {
        const slug = slugFromHash();
        if (meta.has(slug)) loadPage(slug);
    });

    init();
})();
