/* ===== Aiden8115 · 按钮交互 + 密码弹窗 + fetch 下载 ===== */

const API_BASE = 'https://server.aiden8115.cn';
const API_MC_DOWNLOAD = API_BASE + '/api/download/mcdownloader';

/* ========== Toast ========== */
function showToast(text, ok) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (ok === false) toast.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
    toast.innerHTML = '<span class="dot"></span><span>' + text + '</span>';
    stack.appendChild(toast);
    setTimeout(function () {
        toast.classList.add('is-out');
        toast.addEventListener('animationend', function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, { once: true });
    }, 2800);
}

/* ========== 普通下载（前端静态文件） ========== */
function downloadByUrl(url, name, label) {
    const a = document.createElement('a');
    a.href = url;
    if (name) a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(label + ' 下载已触发', true);
}

/* ========== 按钮 ripple + ✓ 状态 ========== */
function installButtonFx(btn) {
    let busy = false;
    btn.addEventListener('click', function (e) {
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const span = document.createElement('span');
        span.className = 'ripple';
        span.style.width = span.style.height = size + 'px';
        span.style.left = (e.clientX - rect.left - size / 2) + 'px';
        span.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
        btn.appendChild(span);
        span.addEventListener('animationend', function () {
            if (span.parentNode) span.parentNode.removeChild(span);
        }, { once: true });

        if (!busy) {
            busy = true;
            btn.classList.add('is-done');
            setTimeout(function () {
                btn.classList.remove('is-done');
                busy = false;
            }, 900);
        }
    });
}

installButtonFx(document.getElementById('btn-fastgithub'));
installButtonFx(document.getElementById('btn-mcdownloader'));
installButtonFx(document.getElementById('btn-geo-ppt'));

/* ========== 三个按钮的下载分支 ========== */
document.getElementById('btn-fastgithub').addEventListener('click', function () {
    downloadByUrl('download/fastgithub-win-x64.zip', 'fastgithub-win-x64.zip', 'FastGitHub');
});
document.getElementById('btn-mcdownloader').addEventListener('click', openPasswordModal);
document.getElementById('btn-geo-ppt').addEventListener('click', function () {
    downloadByUrl('download/dl.pptx', 'dl.pptx', '地理PPT');
});

/* ========== MCDownloader 密码弹窗 ========== */
const pwModal  = document.getElementById('pw-modal');
const pwInput  = document.getElementById('pw-input');
const pwErr    = document.getElementById('pw-err');
const pwSubmit = document.getElementById('pw-submit');
const pwLabel  = pwSubmit.querySelector('.pw-btn-label');
const pwSpinner = document.getElementById('pw-spinner');
const pwEyeOn  = document.getElementById('pw-eye-on');
const pwEyeOff = document.getElementById('pw-eye-off');
let pwBusy = false;

function openPasswordModal() {
    pwModal.classList.add('is-open');
    pwModal.setAttribute('aria-hidden', 'false');
    pwInput.value = '';
    hideError();
    setTimeout(function () { pwInput.focus(); }, 60);
}

function closePasswordModal() {
    if (pwBusy) return;
    pwModal.classList.remove('is-open');
    pwModal.setAttribute('aria-hidden', 'true');
    hideError();
}

function showError(msg) {
    pwErr.textContent = msg;
    pwErr.hidden = false;
    pwInput.classList.remove('is-error');
    // 强制 reflow 以重新触发 shake 动画
    void pwInput.offsetWidth;
    pwInput.classList.add('is-error');
    pwInput.focus();
}
function hideError() {
    pwErr.hidden = true;
    pwInput.classList.remove('is-error');
}

// backdrop 点击关闭（backdrop-filter 会吞事件，CSS 里已去掉）
document.querySelector('.pw-modal-backdrop').addEventListener('click', closePasswordModal);

// 关闭按钮
document.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', closePasswordModal);
});

// ESC
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pwModal.classList.contains('is-open')) {
        closePasswordModal();
    }
});

// 密码可见性切换
document.getElementById('pw-toggle').addEventListener('click', function () {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    pwEyeOn.style.display  = isText ? '' : 'none';
    pwEyeOff.style.display = isText ? 'none' : '';
    pwInput.focus();
});

// Enter 提交
pwInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitPassword();
    }
});
pwSubmit.addEventListener('click', submitPassword);

function setSubmitBusy(busy) {
    pwBusy = busy;
    pwSubmit.disabled = busy;
    pwInput.disabled = busy;
    pwLabel.textContent = busy ? '下载中...' : '确认下载';
    pwSpinner.hidden = !busy;
}

async function submitPassword() {
    if (pwBusy) return;
    const pwd = pwInput.value.trim();
    if (!pwd) {
        showError('密码不能为空');
        return;
    }

    hideError();
    setSubmitBusy(true);

    // 12 秒超时：服务器没部署或慢到不行就主动 abort
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, 12000);

    try {
        const res = await fetch(API_MC_DOWNLOAD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd }),
            signal: ctrl.signal
        });

        if (res.status === 403) {
            showError('密码错误，请重试');
            setSubmitBusy(false);
            return;
        }
        if (res.status === 404) {
            showError('服务器文件未找到');
            setSubmitBusy(false);
            return;
        }
        if (!res.ok) {
            showError('服务器错误（HTTP ' + res.status + '）');
            setSubmitBusy(false);
            return;
        }

        // 成功：从 Content-Disposition 取文件名，取不到用默认
        const cd = res.headers.get('Content-Disposition') || '';
        let fileName = 'MCDownloader-setup.exe';
        const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
        if (m && m[1]) fileName = decodeURIComponent(m[1].trim());

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

        showToast('MCDownloader 下载已触发 ✓', true);
        closePasswordModal();
    } catch (err) {
        if (err.name === 'AbortError') {
            showError('连接超时，服务器 server.aiden8115.cn 可能未启动');
        } else if (err instanceof TypeError) {
            showError('无法连接下载服务器（可能是后端未部署、CORS 被拦截或网络问题）');
        } else {
            showError('请求失败：' + (err.message || '未知错误'));
        }
        console.error('[MCDownloader] fetch failed:', err);
        setSubmitBusy(false);
    } finally {
        clearTimeout(timer);
    }
}

/* ========== 光标光晕（rAF 缓动跟随） ========== */
(function () {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX, curY = targetY;

    document.addEventListener('mousemove', function (e) {
        targetX = e.clientX;
        targetY = e.clientY;
    });

    function tick() {
        curX += (targetX - curX) * 0.14;
        curY += (targetY - curY) * 0.14;
        glow.style.transform = 'translate(' + curX + 'px, ' + curY + 'px) translate(-50%, -50%)';
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();