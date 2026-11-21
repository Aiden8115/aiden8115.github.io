/* ===== WSMUD2 攻略 · 目录 + 按需加载 ===== */
(function () {
    const navEl = document.getElementById('ws-nav');
    const contentEl = document.getElementById('ws-content');
    const titleEl = document.getElementById('ws-doc-title');
    const eyebrowEl = document.getElementById('ws-eyebrow');

    const cache = new Map();
    const meta = new Map(); // slug -> { title, group }
    let loadSeq = 0;
    let currentSlug = null;

    const skeleton = '<div class="ws-skeleton" aria-hidden="true"><span></span><span></span><span></span><span></span></div>';

    function slugFromHash() {
        const raw = location.hash.replace(/^#\/?/, '').trim();
        return raw || 'home';
    }

    function buildNav(nav) {
        const frag = document.createDocumentFragment();
        nav.forEach(function (entry) {
            const item = document.createElement('a');
            item.className = 'ws-nav-item';
            item.href = '#/' + entry.slug;
            item.dataset.slug = entry.slug;
            item.textContent = entry.title;
            meta.set(entry.slug, { title: entry.title, group: '武神MUD2手册' });

            if (entry.children && entry.children.length) {
                const group = document.createElement('div');
                group.className = 'ws-nav-group';
                group.appendChild(item);
                const children = document.createElement('div');
                children.className = 'ws-nav-children';
                entry.children.forEach(function (child) {
                    const link = document.createElement('a');
                    link.className = 'ws-nav-item';
                    link.href = '#/' + child.slug;
                    link.dataset.slug = child.slug;
                    link.textContent = child.title;
                    children.appendChild(link);
                    meta.set(child.slug, { title: child.title, group: entry.title });
                });
                group.appendChild(children);
                frag.appendChild(group);
            } else {
                frag.appendChild(item);
            }
        });
        navEl.innerHTML = '';
        navEl.appendChild(frag);
    }

    function setActive(slug) {
        navEl.querySelectorAll('.ws-nav-item').forEach(function (el) {
            el.classList.toggle('is-active', el.dataset.slug === slug);
        });
        const active = navEl.querySelector('.ws-nav-item.is-active');
        if (active && navEl.scrollHeight > navEl.clientHeight) {
            const delta = active.getBoundingClientRect().top - navEl.getBoundingClientRect().top;
            navEl.scrollTop += delta - navEl.clientHeight / 2 + active.clientHeight / 2;
        }
    }

    async function loadPage(slug) {
        if (slug === currentSlug) return;
        const seq = ++loadSeq;
        currentSlug = slug;
        setActive(slug);

        const info = meta.get(slug);
        eyebrowEl.textContent = info ? info.group : '武神MUD2手册';
        titleEl.textContent = info ? info.title : 'WSMUD2 攻略';

        const cached = cache.get(slug);
        if (!cached) contentEl.innerHTML = skeleton;

        try {
            let data = cached;
            if (!data) {
                const res = await fetch('content/' + encodeURIComponent(slug) + '.json', { cache: 'force-cache' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                data = await res.json();
                cache.set(slug, data);
            }
            if (seq !== loadSeq) return;

            contentEl.innerHTML = data.html;
            titleEl.textContent = data.title;
            document.title = data.title + ' · WSMUD2 攻略';
            window.scrollTo({ top: 0, behavior: 'auto' });
        } catch (err) {
            if (seq !== loadSeq) return;
            contentEl.innerHTML = '<div class="ws-error">章节加载失败：' + (err.message || '未知错误') +
                '<br>请检查网络后重试，或返回 <a href="#/home">手册首页</a>。</div>';
            console.error('[ws] load failed:', slug, err);
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

        const slug = slugFromHash();
        if (!meta.has(slug)) {
            contentEl.innerHTML = '<div class="ws-error">未找到章节「' + slug.replace(/[<>&"]/g, '') +
                '」，请从左侧目录选择，或返回 <a href="#/home">手册首页</a>。</div>';
            if (meta.has('home')) {
                eyebrowEl.textContent = meta.get('home').group;
                titleEl.textContent = meta.get('home').title;
            }
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
