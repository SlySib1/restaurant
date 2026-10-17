document.querySelectorAll('[data-image-input]').forEach((input) => {
  input.addEventListener('change', () => {
    const preview = input.closest('form').querySelector('[data-image-preview]');
    const file = input.files && input.files[0];
    if (!preview || !file) return;

    if (preview.dataset.previewUrl) URL.revokeObjectURL(preview.dataset.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    preview.dataset.previewUrl = previewUrl;
    preview.src = previewUrl;
    preview.hidden = false;
  });
});
