const inputBox = document.getElementById('input-box');
const helpText = document.getElementById('output-area');

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
                main ------- the main page<br>\
                coding ----- Aiden\'s coding exp<br>\
                studying --- Aiden\'s studying exp<br>';
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
    inputBox.value = '';
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