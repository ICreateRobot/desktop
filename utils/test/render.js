const message = 'Hello from renderer process';
window.testAPI.sendMessage(message);

window.testAPI.receiveMessage((arg) => {
    console.log(arg);
});