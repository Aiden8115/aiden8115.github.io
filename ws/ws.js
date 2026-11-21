/* ===== WSMUD2 攻略 · 多级目录 + 按需加载 ===== */
(function () {
    const navEl = document.getElementById('ws-nav');
    const contentEl = document.getElementById('ws-content');
    const titleEl = document.getElementById('ws-doc-title');
    const eyebrowEl = document.getElementById('ws-eyebrow');

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

            if (entry.children && entry.children.length) {
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'ws-nav-toggle';
                toggle.setAttribute('aria-label', '展开或收起 ' + entry.title);
                toggle.textContent = '▾';
                toggle.addEventListener('click', function () {
                    node.classList.toggle('is-collapsed');
                    toggle.textContent = node.classList.contains('is-collapsed') ? '▸' : '▾';
                });
                node.appendChild(toggle);
            } else {
                const spacer = document.createElement('span');
                spacer.className = 'ws-nav-spacer';
                node.appendChild(spacer);
            }

            const link = document.createElement('a');
            link.className = 'ws-nav-item';
            link.href = '#/' + entry.slug;
            link.dataset.slug = entry.slug;
            link.textContent = entry.title;
            node.appendChild(link);
            meta.set(entry.slug, { title: entry.title, group: groupTitle, link: link });

            if (entry.children && entry.children.length) {
                const children = document.createElement('div');
                children.className = 'ws-nav-children';
                buildLevel(entry.children, children, groupTitle);
                node.appendChild(children);
            }

            container.appendChild(node);
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
            el.classList.toggle('is-active', el.dataset.slug === slug);
        });
        const active = navEl.querySelector('.ws-nav-item.is-active');
        if (!active) return;

        // 展开当前章节的所有父级
        let parent = active.closest('.ws-nav-children');
        while (parent) {
            const node = parent.parentElement;
            if (node && node.classList.contains('is-collapsed')) {
                node.classList.remove('is-collapsed');
                const toggle = node.querySelector('.ws-nav-toggle');
                if (toggle) toggle.textContent = '▾';
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
        setActive(slug);

        const info = meta.get(slug);
        eyebrowEl.textContent = info && info.group ? info.group : '武神MUD2手册';
        titleEl.textContent = info ? info.title : 'WSMUD2 攻略';

        const cached = cache.get(slug);
        if (!cached) contentEl.innerHTML = skeleton;

        try {
            let data = cached;
            if (!data) {
                const res = await fetch('content/' + encodeURIComponent(slug) + '.json');
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
