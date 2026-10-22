document.addEventListener("DOMContentLoaded", function () {
    const players = Array.from(document.querySelectorAll("audio"));

    players.forEach((player) => {
        player.addEventListener("play", () => {
            players.forEach((other) => {
                if (other !== player && !other.paused && !other.closest(".tribute-overlay, .profile-media-overlay")) {
                    other.pause();
                }
            });
        });
    });

    const overlay = document.getElementById("tribute-overlay");
    if (overlay) {

    const audio = overlay.querySelector("[data-tribute-audio]");
    const playButton = overlay.querySelector("[data-tribute-play]");
    const playIcon = playButton.querySelector("i");
    const playLabel = playButton.querySelector("span");
    const progressBar = overlay.querySelector("[data-tribute-progress]");
    const currentTime = overlay.querySelector("[data-tribute-current]");
    const durationTime = overlay.querySelector("[data-tribute-duration]");
    const openers = document.querySelectorAll("[data-tribute-open]");
    const closers = overlay.querySelectorAll("[data-tribute-close]");
    const galleryLink = overlay.querySelector("[data-tribute-gallery]");
    let lastFocused = null;

    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "0:00";
        }
        const minutes = Math.floor(seconds / 60);
        const remainder = Math.floor(seconds % 60);
        return `${minutes}:${String(remainder).padStart(2, "0")}`;
    };

    const updateProgress = () => {
        const duration = audio.duration;
        const percent = Number.isFinite(duration) && duration > 0
            ? Math.min(100, (audio.currentTime / duration) * 100)
            : 0;
        progressBar.style.width = `${percent}%`;
        currentTime.textContent = formatTime(audio.currentTime);
        durationTime.textContent = formatTime(duration);
    };

    const setPlaying = (playing) => {
        playIcon.className = playing ? "fas fa-pause" : "fas fa-play";
        playLabel.textContent = playing ? "Pause tribute" : "Play tribute";
        playButton.setAttribute("aria-label", playing ? "Pause tribute" : "Play tribute");
    };

    const openOverlay = () => {
        lastFocused = document.activeElement;
        if (audio.ended) {
            audio.currentTime = 0;
        }
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("tribute-open");
        audio.play().catch(() => setPlaying(false));
        window.requestAnimationFrame(() => playButton.focus({ preventScroll: true }));
    };

    const closeOverlay = () => {
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("tribute-open");
        audio.pause();
        setPlaying(false);
        if (lastFocused && typeof lastFocused.focus === "function") {
            lastFocused.focus({ preventScroll: true });
        }
    };

    openers.forEach((opener) => {
        opener.addEventListener("click", openOverlay);
    });

    closers.forEach((closer) => {
        closer.addEventListener("click", closeOverlay);
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeOverlay();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!overlay.classList.contains("is-open")) {
            return;
        }
        if (event.key === "Escape") {
            closeOverlay();
            return;
        }
        if (event.key !== "Tab") {
            return;
        }
        const focusable = Array.from(overlay.querySelectorAll("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"))
            .filter((element) => element.offsetParent !== null);
        if (!focusable.length) {
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    playButton.addEventListener("click", () => {
        if (audio.paused) {
            if (audio.ended) {
                audio.currentTime = 0;
            }
            audio.play().catch(() => setPlaying(false));
        } else {
            audio.pause();
        }
    });

    if (galleryLink) {
        galleryLink.addEventListener("click", (event) => {
            event.preventDefault();
            const gallery = document.getElementById("gallery");
            closeOverlay();
            if (gallery) {
                const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                gallery.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
            }
        });
    }

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => {
        setPlaying(false);
        audio.currentTime = 0;
        updateProgress();
    });
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);

    setPlaying(false);
    updateProgress();
    }

    const favouriteOverlay = document.getElementById("favourite-overlay");
    if (favouriteOverlay) {
        const audio = favouriteOverlay.querySelector("[data-favourite-audio]");
        const toggle = favouriteOverlay.querySelector("[data-favourite-toggle]");
        const toggleIcon = toggle.querySelector("i");
        const toggleLabel = toggle.querySelector("span");
        const progressBar = favouriteOverlay.querySelector("[data-favourite-progress]");
        const currentTime = favouriteOverlay.querySelector("[data-favourite-current]");
        const durationTime = favouriteOverlay.querySelector("[data-favourite-duration]");
        const photo = favouriteOverlay.querySelector("[data-favourite-photo]");
        const photoUrls = Array.from(favouriteOverlay.querySelectorAll("[data-favourite-photo-url]")).map((el) => el.dataset.favouritePhotoUrl);
        const openers = document.querySelectorAll("[data-favourite-open]");
        const closers = favouriteOverlay.querySelectorAll("[data-favourite-close]");
        const galleryLink = favouriteOverlay.querySelector("[data-favourite-gallery]");
        let lastFocused = null;
        let photoIndex = 0;
        let photoTimer = null;

        const formatTime = (seconds) => {
            if (!Number.isFinite(seconds) || seconds < 0) {
                return "0:00";
            }
            const minutes = Math.floor(seconds / 60);
            const remainder = Math.floor(seconds % 60);
            return `${minutes}:${String(remainder).padStart(2, "0")}`;
        };

        const setPlaying = (playing) => {
            toggleIcon.className = playing ? "fas fa-pause" : "fas fa-play";
            toggleLabel.textContent = playing ? "Pause song" : "Play song";
            toggle.setAttribute("aria-label", playing ? "Pause favourite song" : "Play favourite song");
            favouriteOverlay.classList.toggle("is-playing", playing);
        };

        const setPhoto = () => {
            if (!photo || !photoUrls.length) {
                return;
            }
            photo.style.backgroundImage = `url('${photoUrls[photoIndex]}')`;
            photo.classList.remove("is-changing");
            void photo.offsetWidth;
            photo.classList.add("is-changing");
            photoIndex = (photoIndex + 1) % photoUrls.length;
        };

        const startPhotos = () => {
            if (photoTimer || !photoUrls.length) {
                return;
            }
            setPhoto();
            photoTimer = window.setInterval(setPhoto, 3200);
        };

        const stopPhotos = () => {
            if (!photoTimer) {
                return;
            }
            window.clearInterval(photoTimer);
            photoTimer = null;
        };

        const updateProgress = () => {
            const duration = audio.duration;
            const percent = Number.isFinite(duration) && duration > 0
                ? Math.min(100, (audio.currentTime / duration) * 100)
                : 0;
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
            if (durationTime) durationTime.textContent = formatTime(duration);
        };

        const openOverlay = () => {
            lastFocused = document.activeElement;
            if (audio.ended) {
                audio.currentTime = 0;
            }
            favouriteOverlay.classList.add("active", "is-open");
            favouriteOverlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("favourite-open");
            startPhotos();
            audio.play().catch(() => setPlaying(false));
            window.requestAnimationFrame(() => toggle.focus({ preventScroll: true }));
        };

        const closeOverlay = () => {
            favouriteOverlay.classList.remove("active", "is-open");
            favouriteOverlay.setAttribute("aria-hidden", "true");
            document.body.classList.remove("favourite-open");
            stopPhotos();
            audio.pause();
            setPlaying(false);
            if (lastFocused && typeof lastFocused.focus === "function") {
                lastFocused.focus({ preventScroll: true });
            }
        };

        openers.forEach((opener) => opener.addEventListener("click", openOverlay));
        closers.forEach((closer) => closer.addEventListener("click", closeOverlay));

        favouriteOverlay.addEventListener("click", (event) => {
            if (event.target === favouriteOverlay) {
                closeOverlay();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (!favouriteOverlay.classList.contains("active")) {
                return;
            }
            if (event.key === "Escape") {
                closeOverlay();
                return;
            }
            if (event.key !== "Tab") {
                return;
            }
            const focusable = Array.from(favouriteOverlay.querySelectorAll("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"))
                .filter((element) => element.offsetParent !== null);
            if (!focusable.length) {
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        toggle.addEventListener("click", () => {
            if (audio.paused) {
                if (audio.ended) {
                    audio.currentTime = 0;
                }
                audio.play().catch(() => setPlaying(false));
            } else {
                audio.pause();
            }
        });

        if (galleryLink) {
            galleryLink.addEventListener("click", (event) => {
                event.preventDefault();
                const gallery = document.getElementById("gallery");
                closeOverlay();
                if (gallery) {
                    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    gallery.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
                }
            });
        }

        audio.addEventListener("play", () => {
            setPlaying(true);
            startPhotos();
        });
        audio.addEventListener("pause", () => setPlaying(false));
        audio.addEventListener("ended", () => {
            setPlaying(false);
            stopPhotos();
            audio.currentTime = 0;
            updateProgress();
        });
        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("loadedmetadata", updateProgress);

        if (photoUrls.length && photo) {
            photo.style.backgroundImage = `url('${photoUrls[0]}')`;
        }
        setPlaying(false);
        updateProgress();
    }
});
