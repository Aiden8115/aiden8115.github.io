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

/* ========== 下载分支（WSMUD2攻略为链接跳转，无需处理） ========== */
document.getElementById('btn-fastgithub').addEventListener('click', function () {
    downloadByUrl('download/fastgithub-win-x64.zip', 'fastgithub-win-x64.zip', 'FastGitHub');
});
document.getElementById('btn-mcdownloader').addEventListener('click', openPasswordModal);

/* ========== MCDownloader 密码弹窗 ========== */
const pwModal  = document.getElementById('pw-modal');
const pwInput  = document.getElementById('pw-input');
const pwErr    = document.getElementById('pw-err');
const pwSubmit = document.getElementById('pw-submit');
const pwLabel  = pwSubmit.querySelector('.pw-btn-label');
const pwSpinner = document.getElementById('pw-spinner');
const pwEyeOn  = document.getElementById('pw-eye-on');
const pwEyeOff = document.getElementById('pw-eye-off');
const pwProgress     = document.getElementById('pw-progress');
const pwProgressFill = document.getElementById('pw-progress-fill');
const pwProgressText = document.getElementById('pw-progress-text');
const pwProgressPct  = document.getElementById('pw-progress-pct');
const pwDesc  = document.querySelector('.pw-desc');
const pwField = document.querySelector('.pw-field');
let pwBusy = false;
let pwAbort = null;

// 密码框在 HTML 中默认是 type="password"（无 JS 时也安全）。
// 但部分输入法不会在密码框中记录词频，这里改用 text + CSS 掩码，
// 让输入法按普通文本框处理；不支持掩码的浏览器仍退回 type="password"。
const canMaskPwd = !!(window.CSS && CSS.supports && CSS.supports('-webkit-text-security', 'disc'));
let pwMasked = true;
if (canMaskPwd) {
    pwInput.type = 'text';
    pwInput.classList.add('pw-masked');
}

function openPasswordModal() {
    pwModal.classList.add('is-open');
    pwModal.setAttribute('aria-hidden', 'false');
    pwInput.value = '';
    hideError();
    hideProgress();
    setSubmitBusy(false);
    setTimeout(function () { pwInput.focus(); }, 60);
}

function closePasswordModal(force) {
    // 下载中关闭弹窗 = 取消下载
    if (pwAbort) {
        pwAbort.abort();
        pwAbort = null;
    } else if (!force && pwBusy) {
        return;
    }
    setSubmitBusy(false);
    hideProgress();
    pwModal.classList.remove('is-open');
    pwModal.setAttribute('aria-hidden', 'true');
    hideError();
}

// —— 进度显示 ——
function showProgressView() {
    hideError();
    pwDesc.hidden = true;
    pwField.hidden = true;
    pwProgress.hidden = false;
    pwProgress.classList.remove('is-indeterminate');
    pwProgressFill.style.width = '0%';
    pwProgressText.textContent = '正在连接下载服务器…';
    pwProgressPct.textContent = '';
}

function renderProgress(received, total) {
    if (total > 0) {
        const pct = Math.min(100, Math.round(received / total * 100));
        pwProgress.classList.remove('is-indeterminate');
        pwProgressFill.style.width = pct + '%';
        pwProgressPct.textContent = pct + '%';
        pwProgressText.textContent = '已下载 ' + formatMB(received) + ' / ' + formatMB(total);
    } else {
        // 服务器未给出总大小时用滚动条动画表示进度
        pwProgress.classList.add('is-indeterminate');
        pwProgressPct.textContent = '';
        pwProgressText.textContent = '已下载 ' + formatMB(received);
    }
}

function hideProgress() {
    pwProgress.hidden = true;
    pwProgress.classList.remove('is-indeterminate');
    pwDesc.hidden = false;
    pwField.hidden = false;
    pwProgressFill.style.width = '0%';
}

function formatMB(bytes) {
    return (bytes / 1048576).toFixed(1) + ' MB';
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
    pwMasked = !pwMasked;
    if (canMaskPwd) {
        pwInput.classList.toggle('pw-masked', pwMasked);
    } else {
        pwInput.type = pwMasked ? 'password' : 'text';
    }
    pwEyeOn.style.display  = pwMasked ? '' : 'none';
    pwEyeOff.style.display = pwMasked ? 'none' : '';
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

// 密码校验请求：
//  - 用 text/plain 发送 JSON，属于 CORS 简单请求，不触发 OPTIONS 预检
//  - 网络抖动 / 连接被重置时自动重试（最多 3 次）
async function requestPasswordCheck(pwd) {
    let lastErr;
    for (let i = 0; i < 3; i++) {
        const ctrl = new AbortController();
        const timer = setTimeout(function () { ctrl.abort(); }, 10000);
        try {
            return await fetch(API_MC_DOWNLOAD, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ password: pwd }),
                mode: 'cors',
                signal: ctrl.signal
            });
        } catch (err) {
            lastErr = err;
            if (i < 2) {
                await new Promise(function (r) { setTimeout(r, 500 * (i + 1)); });
            }
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr;
}

// 页面内流式下载：全程不跳转，边下边显示进度；
// 30 秒收不到任何数据则视为连接卡死，自动中断
async function downloadFile(url) {
    const ctrl = new AbortController();
    pwAbort = ctrl;
    let idleTimer = null;
    const resetIdle = function () {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(function () { ctrl.abort(); }, 30000);
    };
    resetIdle();
    try {
        const res = await fetch(url, { mode: 'cors', signal: ctrl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const total = Number(res.headers.get('Content-Length')) || 0;
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;
        renderProgress(received, total);
        for (;;) {
            const step = await reader.read();
            if (step.done) break;
            chunks.push(step.value);
            received += step.value.length;
            renderProgress(received, total);
            resetIdle();
        }
        return new Blob(chunks, { type: 'application/octet-stream' });
    } finally {
        clearTimeout(idleTimer);
        pwAbort = null;
    }
}

function saveBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BestMCLauncher-Setup-1.0.0.exe';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
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

    // 第一步：校验密码，拿到带令牌的下载地址
    let url;
    try {
        const res = await requestPasswordCheck(pwd);
        let data = null;
        try { data = await res.json(); } catch (e) {}

        if (res.status === 403) {
            showError('密码错误，请重试');
            setSubmitBusy(false);
            return;
        }
        if (!res.ok || !data || !data.url) {
            showError((data && data.message) || ('服务器错误（HTTP ' + res.status + '）'));
            setSubmitBusy(false);
            return;
        }
        url = data.url;
    } catch (err) {
        if (err && err.name === 'AbortError') {
            showError('请求超时，请重试');
        } else if (err instanceof TypeError) {
            showError('无法连接服务器，请检查网络后重试');
        } else {
            showError('请求失败：' + (err.message || '未知错误'));
        }
        console.error('[BestMCLauncher] auth failed:', err);
        setSubmitBusy(false);
        return;
    }

    // 第二步：在弹窗内流式下载，完成后保存（不跳转、不出现空白页）
    showProgressView();
    try {
        const blob = await downloadFile(url);
        saveBlob(blob);
        closePasswordModal(true);
        showToast('下载完成，正在保存文件...', true);
    } catch (err) {
        if (!pwModal.classList.contains('is-open')) return; // 用户已取消
        hideProgress();
        if (err && err.name === 'AbortError') {
            showError('下载超时，请重试');
        } else if (err instanceof TypeError) {
            showError('无法连接下载服务器，请检查网络后重试');
        } else {
            showError('下载失败：' + (err.message || '未知错误'));
        }
        console.error('[BestMCLauncher] download failed:', err);
        setSubmitBusy(false);
    }
}

/* ========== 光标光晕（rAF 缓动跟随，静止后自动停止渲染） ========== */
(function () {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX, curY = targetY;
    let rafId = 0;

    function render() {
        glow.style.transform = 'translate3d(' + curX + 'px,' + curY + 'px,0) translate(-50%,-50%)';
    }

    function tick() {
        curX += (targetX - curX) * 0.14;
        curY += (targetY - curY) * 0.14;
        render();
        // 追上目标后停下，避免空闲时仍持续占用合成线程
        if (Math.abs(targetX - curX) < 0.5 && Math.abs(targetY - curY) < 0.5) {
            rafId = 0;
            return;
        }
        rafId = requestAnimationFrame(tick);
    }

    function start() {
        if (!rafId) rafId = requestAnimationFrame(tick);
    }

    document.addEventListener('mousemove', function (e) {
        targetX = e.clientX;
        targetY = e.clientY;
        start();
    });

    render();
})();