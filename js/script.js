const inputBox = document.getElementById('input-box');

function scrollToBottom() {
    const scrollContainer = document.getElementById('body-border');
    if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
}

function checkInput() {
    const inputValue = inputBox.value.trim().toLowerCase();
    if (inputValue === 'help') {
        // helpText.style.display = 'block';
        const bodyBorder = document.getElementById("body-border");

        if (bodyBorder) {
            const body = document.getElementById('output-area');
            if (body) {
                const helpText = document.createElement('p');
                helpText.innerHTML = 'Commands: <br>\
                main -------------- 主页<br>\
                coding ------------ 我的编程经历<br>\
                studying ---------- 我的学习经历<br>\
                fastgithub-win ---- 下载FastGitHub<br>\
                dl ---------------- 下载地理演讲PPT';
                helpText.style.color = '#ffffff';
                body.append(helpText);
                scrollToBottom();
            }
        }
    }
    if (inputValue === 'coding') {
        window.location.href = 'coding.html';
    }
    if (inputValue === 'main') {
        window.location.href = 'index.html';
    }
    if (inputValue === 'studying') {
        window.location.href = 'studying.html'
    }
    if (inputValue === 'fastgithub-win') {
        downloadByUrl('download/fastgithub-win-x64.zip', 'fastgithub-win-x64.zip');
    }
    if (inputValue === 'dl') {
        downloadByUrl('download/dl.pptx', 'dl.pptx');
    }
    inputBox.value = '';
}

function downloadByUrl(url, name) {
    const a = document.createElement('a');
    a.href = url;
    if (name) a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

inputBox.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkInput();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const targetElement = document.getElementById('input-box');
    if (targetElement) {
        targetElement.focus();
    }
});