// Chỉ tải lại ảnh CAPTCHA từ server. Mã xác nhận không bao giờ được lưu ở client.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-captcha-refresh]');
  if (!trigger) return;

  const container = trigger.closest('.captcha-row');
  const image = container ? container.querySelector('.captcha-image') : null;
  if (!image) return;

  image.src = `/auth/captcha.svg?t=${Date.now()}`;
  const input = container.querySelector('input[name="captcha"]');
  if (input) {
    input.value = '';
    input.focus();
  }
});
