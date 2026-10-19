
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQWI_kX1slYSb0QeO_kTOqPx2eZjvZZFI",
  authDomain: "tama-order-6ce3a.firebaseapp.com",
  projectId: "tama-order-6ce3a",
  storageBucket: "tama-order-6ce3a.firebasestorage.app",
  messagingSenderId: "719001257673",
  appId: "1:719001257673:web:ea7d0883226913384aaf18",
  measurementId: "G-HNNMN7NSCS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("reviewForm");
const ratingPicker = document.getElementById("ratingPicker");
const nameInput = document.getElementById("reviewName");
const commentInput = document.getElementById("reviewComment");
const submitButton = document.getElementById("reviewSubmit");
const message = document.getElementById("reviewMessage");
const averageElement = document.getElementById("reviewAverage");
const averageStars = document.getElementById("reviewAverageStars");
const countElement = document.getElementById("reviewCount");
const reviewList = document.getElementById("reviewList");

let selectedRating = 0;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#f87171" : "#22d3ee";
}

// Mengatur tombol bintang
ratingPicker.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-rating]");
  if (!button) return;

  selectedRating = Number(button.dataset.rating);

  ratingPicker.querySelectorAll("button[data-rating]").forEach((star) => {
    const active = Number(star.dataset.rating) <= selectedRating;
    star.classList.toggle("active", active);
    star.setAttribute("aria-pressed", String(active));
  });
});


const showAllButton = document.getElementById("showAllReviews");
let showAllReviews = false;

// Memuat ulasan yang sudah disetujui admin
async function loadReviews() {
  try {
    const approvedQuery = query(
      collection(db, "reviews"),
      where("status", "==", "approved")
    );

    const snapshot = await getDocs(approvedQuery);
    const reviews = snapshot.docs.map((doc) => doc.data());

    reviews.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    // Rating dan jumlah tetap menghitung semua ulasan approved
    const count = reviews.length;
    const average = count
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / count
      : 0;

    averageElement.textContent = count ? average.toFixed(1) : "—";
    averageStars.textContent = count
      ? "★".repeat(Math.round(average)) +
        "☆".repeat(5 - Math.round(average))
      : "☆☆☆☆☆";

    countElement.textContent = `${count} ulasan`;

    // Tampilkan maksimal 3 ulasan, kecuali tombol dibuka
    const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

    reviewList.replaceChildren();

    if (count === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Belum ada ulasan yang disetujui.";
      reviewList.appendChild(empty);
    } else {
      visibleReviews.forEach((review) => {
        const card = document.createElement("article");
        card.className = "review-card";

        const title = document.createElement("h4");
        title.textContent = review.name;

        const stars = document.createElement("div");
        stars.className = "review-card-stars";
        stars.textContent =
          "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

        const comment = document.createElement("p");
        comment.textContent = review.comment;

        card.append(title, stars, comment);
        reviewList.appendChild(card);
      });
    }

    // Tombol hanya muncul jika ulasan lebih dari 3
    if (showAllButton) {
      showAllButton.hidden = count <= 3;
      showAllButton.textContent = showAllReviews
        ? "Tampilkan Lebih Sedikit"
        : "Lihat Semua Ulasan";
    }
  } catch (error) {
    console.error("Gagal memuat ulasan:", error);
    reviewList.textContent = "Ulasan belum bisa dimuat. Coba refresh halaman.";
  }
}

if (showAllButton) {
  showAllButton.addEventListener("click", () => {
    showAllReviews = !showAllReviews;
    loadReviews();
  });
}

// Mengirim ulasan ke Firestore
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const comment = commentInput.value.trim();

  if (name.length < 2 || name.length > 40) {
    showMessage("Nama harus 2–40 karakter.", true);
    return;
  }

  if (selectedRating < 1 || selectedRating > 5) {
    showMessage("Pilih rating 1 sampai 5 bintang dulu.", true);
    return;
  }

  if (comment.length < 3 || comment.length > 500) {
    showMessage("Komentar harus 3–500 karakter.", true);
    return;
  }

  submitButton.disabled = true;
  showMessage("Sedang mengirim ulasan...");

  try {
    await addDoc(collection(db, "reviews"), {
      name,
      rating: selectedRating,
      comment,
      status: "pending",
      createdAt: serverTimestamp()
    });

    form.reset();
    selectedRating = 0;

    ratingPicker.querySelectorAll("button[data-rating]").forEach((star) => {
      star.classList.remove("active");
      star.setAttribute("aria-pressed", "false");
    });

    showMessage("Ulasan terkirim! Ulasan akan tampil setelah disetujui admin.");
  } catch (error) {
    console.error("Gagal mengirim ulasan:", error);
    showMessage(
      "Ulasan gagal dikirim. Periksa koneksi dan aturan Firestore.",
      true
    );
  } finally {
    submitButton.disabled = false;
  }
});

loadReviews();
