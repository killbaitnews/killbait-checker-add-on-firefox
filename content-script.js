(() => {
  const apikey = localStorage.getItem('apikey');
  if (!apikey) return;

  browser.runtime.sendMessage({
    type: 'KB_APIKEY',
    apikey
  }).catch(err => {
    console.warn("Error sending KB_APIKEY message:", err);
  });
})();
