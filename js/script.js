/* ===== Aiden8115 按钮交互与特效 ===== */

// 下载触发 + toast 提示 + 按钮 is-done 状态
function downloadByUrl(url, name, label) {
    const a = document.createElement('a');
    a.href = url;
    if (name) a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(label + ' 下载已触发');
}

function showToast(text) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<span class="dot"></span><span>' + text + '</span>';
    stack.appendChild(toast);
    setTimeout(function () {
        toast.classList.add('is-out');
        toast.addEventListener('animationend', function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, { once: true });
    }, 2400);
}

// 按钮 ripple + is-done 状态
function installButtonFx(btn) {
    let busy = false;

    btn.addEventListener('click', function (e) {
        // 涟漪
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

        // ✓ 状态
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

// 按钮各自的下载逻辑
document.getElementById('btn-fastgithub').addEventListener('click', function () {
    downloadByUrl('download/fastgithub-win-x64.zip', 'fastgithub-win-x64.zip', 'FastGitHub');
});
document.getElementById('btn-mcdownloader').addEventListener('click', function () {
    downloadByUrl('download/MCDownloader-setup.exe', 'MCDownloader-setup.exe', 'MCDownloader');
});
document.getElementById('btn-geo-ppt').addEventListener('click', function () {
    downloadByUrl('download/dl.pptx', 'dl.pptx', '地理PPT');
});

// ===== 光标光晕（rAF throttle） =====
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
        // 平滑缓动，让光晕有"跟随感"
        curX += (targetX - curX) * 0.14;
        curY += (targetY - curY) * 0.14;
        glow.style.transform = 'translate(' + curX + 'px, ' + curY + 'px) translate(-50%, -50%)';
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();