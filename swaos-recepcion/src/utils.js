import Swal from "sweetalert2";

// ==========================================
// MOTOR DE ALERTAS FLOTANTES (TOASTS)
// ==========================================
export const alertaToast = (icon, title) => {
  const esOscuro = document.documentElement.classList.contains("dark");
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: icon,
    title: title,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    background: esOscuro ? "#1e293b" : "#ffffff",
    color: esOscuro ? "#f8fafc" : "#0f172a",
    customClass: {
      popup:
        "border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl",
    },
  });
};

// ==========================================
// COMPRESOR DE IMÁGENES EN NAVEGADOR (.webp)
// ==========================================
export const comprimirImagen = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), "image/webp", 0.75);
      };
    };
  });
};
