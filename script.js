document.addEventListener("DOMContentLoaded", function () {
    let studentList = [];
    let currentReader = null;
    let currentElement = {
        icon: null,
        element: null,
        state: false,
        student: null
    };

    let currentFavSong = null;
    let currentStudentPhotoIndex = 0;
    let introTimer = null;
    let hasStarted = false;

    let LikedStudents = JSON.parse(localStorage.getItem("LikedStudents") || "[]");
    let picChanger;
    let  photoChanger;

    function escapeHtml(value = "") {
        return String(value).replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));
    }

    function slugifyName(name = "") {
        return name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function cardMarkup(student) {
        const name = student.studentName;
        const alias = (student.studentAlias || "").trim();
        const slug = student.studentSlug || slugifyName(name);
        const alt = `${name}${alias ? ` (${alias})` : ""}, Class of 2017`;

        return `
            <div class="card-phone">
                <span class="card-phone-notch" aria-hidden="true"></span>
                <div class="main-content">
                    <img src="${student.studentPhotos[0]}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">
                </div>
                <div class="card-info">
                    ${alias ? `<p class="card-alias">${escapeHtml(alias)}</p>` : ""}
                    <h2 class="card-name">${escapeHtml(name)}</h2>
                    <div class="card-actions">
                        <a class="profile-link" href="students/${slug}/">View profile <i class="fas fa-arrow-right"></i></a>
                        <button type="button" class="save-image" aria-label="Save this card as an image"><i class="fas fa-camera"></i> Save as image</button>
                    </div>
                </div>
                <div class="circles">
                    <div class="circle" title="Mute favourite song" aria-label="Mute favourite song"><i class="fas fa-volume-up"></i></div>
                    <div class="circle" title="Play tribute and read description" aria-label="Play tribute and read description"><i class="fa-solid fa-circle-info"></i></div>
                    <div class="circle" title="Like this student" aria-label="Like this student">&#10084;</div>
                    <div class="circle" title="Admission number" aria-label="Admission number">${student.studentAdmissionNumber}</div>
                    <div class="circle" title="Play favourite song" aria-label="Play favourite song">&#9835;</div>
                </div>
            </div>`;
    }
    

    document.documentElement.scrollTop = 0; // For modern browsers
    document.body.scrollTop = 0; // For older browsers or compatibility


    fetch('students.json')
    .then((response) => {
        if (!response.ok) {
            throw new Error("Failed to load data");
        }
        return response.json();
    })
    .then((data) => {
        const usedSlugs = new Set();
        const withSlugs = data.map((student) => {
            const fallback = slugifyName(student.studentName) || "student";
            let slug = fallback;
            if (usedSlugs.has(slug)) {
                slug = `${fallback}-${student.studentAdmissionNumber}`;
            }
            let candidate = slug;
            let counter = 2;
            while (usedSlugs.has(candidate)) {
                candidate = `${slug}-${counter}`;
                counter += 1;
            }
            usedSlugs.add(candidate);
            return { ...student, studentSlug: candidate };
        });

        const shuffled = shuffleList([...withSlugs]);

        // Ensure Lydiah Wambui is always first
        const lydiahIndex = shuffled.findIndex(student => student.studentName === "Lydiah Wambui");
        if (lydiahIndex !== -1) {
            const lydiah = shuffled.splice(lydiahIndex, 1)[0]; // Remove Lydiah from the shuffled array
            shuffled.unshift(lydiah); // Add her to the beginning
        }

        studentList = shuffled;
        preloadStudents();

        introTimer = window.setTimeout(startExperience, 2800);
    })
    .catch((err) => {
        console.error(err);
    });

    function startExperience() {
        if (hasStarted) {
            return;
        }
        hasStarted = true;
        if (introTimer) {
            clearTimeout(introTimer);
            introTimer = null;
        }
        const loading = document.querySelector('.loading-animation');
        if (loading) {
            loading.style.display = 'none';
        }
        populateStudents();
    }

    async function saveCardAsImage(li, student) {
        const phone = li.querySelector('.card-phone') || li;
        const mainContent = phone.querySelector('.main-content');
        const image = mainContent ? mainContent.querySelector('img') : null;

        if (typeof html2canvas !== 'function' || li.dataset.saving === 'true') {
            return;
        }

        li.dataset.saving = 'true';

        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready.catch(() => {});
        }

        const photoSrc = image ? (image.currentSrc || image.src) : null;
        let restorePhoto = null;

        if (mainContent && image && photoSrc) {
            await new Promise((resolve) => {
                const preload = new Image();
                preload.onload = resolve;
                preload.onerror = resolve;
                preload.src = photoSrc;
            });

            const previousBackground = mainContent.style.backgroundImage;
            const previousSize = mainContent.style.backgroundSize;
            const previousPosition = mainContent.style.backgroundPosition;
            const previousDisplay = image.style.display;

            mainContent.style.backgroundImage = `url("${photoSrc}")`;
            mainContent.style.backgroundSize = 'cover';
            mainContent.style.backgroundPosition = 'center';
            image.style.display = 'none';

            restorePhoto = () => {
                mainContent.style.backgroundImage = previousBackground;
                mainContent.style.backgroundSize = previousSize;
                mainContent.style.backgroundPosition = previousPosition;
                image.style.display = previousDisplay;
            };
        }

        try {
            const canvas = await html2canvas(phone, {
                backgroundColor: null,
                scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
                useCORS: true,
                logging: false,
                imageTimeout: 15000
            });
            const link = document.createElement('a');
            link.download = `${student.studentSlug || slugifyName(student.studentName)}-class-of-2017.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error(error);
        } finally {
            if (restorePhoto) {
                restorePhoto();
            }
            delete li.dataset.saving;
        }
    }

    document.querySelector('main').addEventListener('click', function (event) {
        const saveButton = event.target.closest('.save-image');
        if (!saveButton) {
            return;
        }
        const li = saveButton.closest('li');
        if (!li) {
            return;
        }
        const index = Array.from(li.parentElement.children).indexOf(li);
        const student = studentList[index];
        if (student) {
            saveCardAsImage(li, student);
        }
    });

    document.querySelector('.intro-trailer').onclick = function () {
        if (introTimer) {
            clearTimeout(introTimer);
            introTimer = null;
        }
        let isPlayingVid = false;
        let isMuted = false;

         document.querySelector('.loading-animation').style.display = 'none'
        document.querySelector('.video-overlay').style.display = 'flex'
        
        const  video = document.querySelector('.video-overlay .video-content video');
        const playBtn = document.querySelectorAll('.video-overlay .video-content .video-controls .video-buttons button')[0];
        const muteBtn = document.querySelectorAll('.video-overlay .video-content .video-controls .video-buttons button')[1];
        const bar = document.querySelector('.video-overlay .video-content .video-controls .progress-truck .progress-bar');
        const controls = document.querySelector('.video-overlay .video-content .video-controls');


        playBtn.onclick = function () {
            isPlayingVid = !isPlayingVid;

            playBtn.innerHTML = isPlayingVid ? '&#10074;&#10074;' : '&#9654;';

            if(isPlayingVid){video.play();}
            else{video.pause();}

        }

        muteBtn.onclick = () => {
            isMuted = !isMuted;
            muteBtn.innerHTML = isMuted  ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-up"></i>';

            video.muted = isMuted;
        }

        video.ontimeupdate = () => {
            bar.style.width = `${(video.currentTime / video.duration) * 100}%`
        }

        video.addEventListener('playing' , function() {
            showLoading(false);
            setTimeout(() => {
                controls.style.display = ' none';
            },5000)
        });

        video.addEventListener('mouseout' , function() {
            setTimeout(() => {
                controls.style.display = ' none';
            },5000)
        });

        video.addEventListener('touchstart' , function() {
            setTimeout(() => {
                controls.style.display = ' flex';
            },100)
        });

        video.addEventListener('mouseover' , function() {
            setTimeout(() => {
                controls.style.display = ' flex';
            },100)
        });

        video.addEventListener('mousemove' , function() {
            setTimeout(() => {
                controls.style.display = ' flex';
            },100)
        });

        video.addEventListener('waiting' , function() {
            controls.style.display = ' flex';
            showLoading(true);
        });

        video.addEventListener('stalled' , function() {
            controls.style.display = ' flex';
            showLoading(true);
        });

        video.addEventListener('ended' , function() {
            controls.style.display = ' flex';
            showLoading(false);
            isPlayingVid = false;
            playBtn.innerHTML = isPlayingVid ? '&#10074;&#10074;' : '&#9654;';
            bar.style.width = '0%'
        });

        video.addEventListener('error' , function() {
            controls.style.display = ' flex';
            showLoading(true);

            setTimeout(function() {
                window.location.reload();
            },6000);
        });

        document.querySelector('.video-close').onclick = function () {
            video.pause();
            video.currentTime = 0;
            video.muted = false;
            playBtn.innerHTML = '&#9654;';
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';

            document.querySelector('.video-overlay').style.display = 'none';
            startExperience();
        }

        let isFullScreen = false; // Flag to track full-screen state

        // Function to enter full-screen mode
        function enterFullScreen() {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen(); // Safari support
            } else if (video.msRequestFullscreen) {
                video.msRequestFullscreen(); // IE/Edge support
            }
            isFullScreen = true;
        }

        // Function to exit full-screen mode
        function exitFullScreen() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen(); // Safari support
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen(); // IE/Edge support
            }
            isFullScreen = false;
        }

        // Function to toggle full-screen mode
        function toggleFullScreen() {
            if (isFullScreen) {
                exitFullScreen();
            } else {
                enterFullScreen();
            }
        }

        // Add double-click event listener to the video
        video.addEventListener('dblclick', toggleFullScreen);
    }


    function buildAddStudentCard() {
        const students = studentList.slice(0, 10);
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, 3);
        const faces = picked.map((student) => {
            const photo = (student.studentPhotos || [])[0] || 'logo.png';
            return `<div class="add-student-cta-face"><img src="${photo}" alt="${escapeHtml(student.studentName)}" loading="lazy" decoding="async"></div>`;
        }).join('');

        return `
            <li>
                <div class="add-student-cta-card">
                    <div class="add-student-cta-content">
                        <p class="add-student-cta-kicker">Class of 2017</p>
                        <h2>Missing someone?</h2>
                        <p>Add a fellow classmate to the archive so their story can live on.</p>
                    </div>
                    <div class="add-student-cta-faces">
                        ${faces || `<div class="add-student-cta-face"><img src="logo.png" alt="Alumni MMXVII"></div>`}
                    </div>
                    <div class="add-student-cta-actions">
                        <a class="add-student-cta-btn" href="add-student/"><i class="fas fa-user-plus"></i> Add a new student</a>
                    </div>
                </div>
            </li>`;
    }

    function preloadStudents() {
        const studentContainer = document.querySelector('main .student-container ul');
        if (!studentContainer || studentList.length === 0) {
            return;
        }

        studentList.forEach((student) => {
            const li = document.createElement('li');
            li.style.setProperty('--accent', student.studentFavColor || '#0056b3');
            studentContainer.appendChild(li);

            (student.studentPhotos || []).slice(0, 3).forEach((src) => {
                const image = new Image();
                image.src = src;
            });
        });

        const addLi = document.createElement('li');
        addLi.innerHTML = buildAddStudentCard().replace('<li>', '').replace('</li>', '');
        studentContainer.appendChild(addLi);

        if (studentList[0]) {
            document.querySelector('main').style.setProperty('--page-accent', studentList[0].studentFavColor || '#0056b3');
        }
    }

    function populateStudents() {
        const studentContainer = document.querySelector('main .student-container ul');
        if (studentList.length === 0 || studentContainer.dataset.observed === 'true') {
            return;
        }

        if (studentContainer.children.length === 0) {
            preloadStudents();
        }

        studentContainer.dataset.observed = 'true';
        observeStudentProfiles(studentContainer);
    }

    // Observe and populate <li> content in viewport
    function observeStudentProfiles(container) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const li = entry.target;
                        const index = Array.from(container.children).indexOf(li);
                        let isFavSongMuted = false;
                        

                    // Populate <li> with student data
                    if (!li.innerHTML && studentList[index]) {
                        const student = studentList[index];
                        let currentImageIndex = 0;
                        

                        li.innerHTML = cardMarkup(student);

                        currentElement.student = student;
                        currentElement.element = li;

                        const  muteButton = li.querySelectorAll('.circles .circle')[0];
                        const playButton = li.querySelectorAll('.circles .circle')[1];
                        const likeButton = li.querySelectorAll('.circles .circle')[2];
                        const imagButton = li.querySelectorAll('.circles .circle')[3];
                        const songButton = li.querySelectorAll('.circles .circle')[4];

                        imagButton.classList.add('unchattered')

                        const isAlreadyLiked = LikedStudents.some(std => std.studentName === student.studentName);
                        likeButton.classList.toggle('liked', isAlreadyLiked);

                        playButton.onclick = function () {
                            clearInterval(picChanger);
                            if (currentFavSong && !currentFavSong.paused) {
                                currentFavSong.pause();
                            }
                            const isCurrentlyPlaying = currentElement && currentElement.state && currentElement.element === li;
                            playDescription(new Audio(student.studentAudioReader), playButton, li, !isCurrentlyPlaying);
                            displayDescription(student);
                        };

                        likeButton.onclick = function () {
                            // Check if the student is already liked
                            const isAlreadyLiked = LikedStudents.some(std => std.studentName === student.studentName);
                        
                            if (isAlreadyLiked) {
                                // Remove student from LikedStudents if already liked
                                LikedStudents = LikedStudents.filter(s => s.studentName !== student.studentName);
                            } else {
                                // Add student to LikedStudents if not already liked
                                LikedStudents.push(student);
                            }
                        
                            // Update localStorage
                            localStorage.setItem("LikedStudents", JSON.stringify(LikedStudents));
                        
                            // Reflect the updated state in the UI
                            likeButton.classList.toggle('liked', !isAlreadyLiked);
                        };
                        

                        imagButton.onclick = function () {
                            console.log(student)
                        };

                        songButton.onclick = function () {
                            clearInterval(picChanger);
                            currentStudentPhotoIndex = 0;
                            const cardImage = li.querySelector('.main-content img');
                            if (cardImage) {
                                cardImage.src = student.studentPhotos[currentStudentPhotoIndex];
                            }
                            if (currentFavSong && !currentFavSong.paused) {
                                currentFavSong.pause();
                            }
                            showMedia(student);
                        };

                        muteButton.onclick = function() {
                            isFavSongMuted = !isFavSongMuted;

                            if(currentFavSong) {
                                currentFavSong.muted = isFavSongMuted;
                                
                            }

                            muteButton.innerHTML = isFavSongMuted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-up"></i>';
                        }
                    }

                    const student = studentList[index];
                    li.style.setProperty('--accent', student.studentFavColor || '#0056b3');
                    document.querySelector('main').style.setProperty('--page-accent', student.studentFavColor || '#0056b3');

                    playFavSong(student, true, li);
                } else {
                    // Handle when element is out of view
                    if (currentElement && currentElement.student && currentElement.element) {
                        const student = currentElement.student;
                        const li = currentElement.element;
                        playFavSong(student, false, li);
                        currentFavSong = null;
                        picChanger = null;
                        isFavSongMuted = false;
                        const muteButton = li.querySelectorAll('.circles .circle')[0];
                        if (muteButton) {
                            muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                        }
                    }
                }
            });
        },
        { root: null, threshold: 0.6 }
    );

    // Observe each <li>
    container.querySelectorAll('li').forEach((li) => observer.observe(li));

    // Manually handle the first student
    const firstLi = Array.from(container.querySelectorAll('li')).find((li) => li.querySelector('.card-phone'));
    if (firstLi && studentList[0]) {
        const student = studentList[0];
        currentElement.student = student;
        currentElement.element = firstLi;
        firstLi.style.setProperty('--accent', student.studentFavColor || '#0056b3');
        document.querySelector('main').style.setProperty('--page-accent', student.studentFavColor || '#0056b3');
        playFavSong(student, true, firstLi);
        // Populate the first student's data if necessary
            if (!firstLi.innerHTML || !firstLi.querySelector('.card-phone')) {
                firstLi.innerHTML = cardMarkup(student);

                const  muteButton = firstLi.querySelectorAll('.circles .circle')[0];
                const playButton = firstLi.querySelectorAll('.circles .circle')[1];
                const likeButton = firstLi.querySelectorAll('.circles .circle')[2];
                const imagButton = firstLi.querySelectorAll('.circles .circle')[3];
                const songButton = firstLi.querySelectorAll('.circles .circle')[4];

                imagButton.classList.add('unchattered');

                const isAlreadyLiked = LikedStudents.some(std => std.studentName === student.studentName);
                likeButton.classList.toggle('liked', isAlreadyLiked);

                let isFavSongMuted = false;
                muteButton.onclick = function() {
                    isFavSongMuted = !isFavSongMuted;

                    if(currentFavSong) {
                        currentFavSong.muted = isFavSongMuted;
                        
                    }

                    muteButton.innerHTML = isFavSongMuted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-up"></i>'
                }

                songButton.onclick = function () {
                    clearInterval(picChanger);
                    currentStudentPhotoIndex = 0;
                    const cardImage = firstLi.querySelector('.main-content img');
                    if (cardImage) {
                        cardImage.src = student.studentPhotos[currentStudentPhotoIndex];
                    }
                    if (currentFavSong && !currentFavSong.paused) {
                        currentFavSong.pause();
                    }
                    showMedia(student);
                };

                likeButton.onclick = function () {
                    const isLiked = LikedStudents.some(std => std.studentName === student.studentName);
                    if (isLiked) {
                        LikedStudents = LikedStudents.filter(s => s.studentName !== student.studentName);
                        likeButton.classList.toggle('liked', !isLiked);
                    } else {
                        LikedStudents.push(student);
                        likeButton.classList.toggle('liked', isLiked);
                    }
                    localStorage.setItem("LikedStudents", JSON.stringify(LikedStudents));
                    likeButton.classList.toggle('liked', !isLiked);
                };

                playButton.onclick = function () {
                    clearInterval(picChanger);
                    if (currentFavSong && !currentFavSong.paused) {
                        currentFavSong.pause();
                    }
                    const isCurrentlyPlaying = currentElement && currentElement.state && currentElement.element === firstLi;
                    playDescription(new Audio(student.studentAudioReader), playButton, firstLi, !isCurrentlyPlaying);
                    displayDescription(student);
                };

                 // Reset mute button state when out of viewport
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) {
                            // Reset mute button state
                            isFavSongMuted = false;
                            muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                            if (currentFavSong) {
                                currentFavSong.muted = isFavSongMuted;
                            }
                        }
                    });
                }, { threshold: 0.1 }); // Adjust threshold if needed

                observer.observe(firstLi);
            }
        }  
        
    }



     // Function to play/pause audio
     function playDescription(reader, playBtn, element, status) {
        // If another audio is playing, pause it
        if (currentReader && currentReader !== reader) {
            currentReader.pause();
            currentElement.icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>'; // Change to play icon
            currentElement.state = false;
        }

        // Toggle play/pause based on the status
        if (status) {
            currentReader = reader;
            currentElement = { icon: playBtn, element: element, state: true };
            currentElement.icon.innerHTML = '&#10074;&#10074;'; // Change to pause icon
            currentReader.play();
            document.querySelector('.description-ovelay').classList.add('active');
            document.body.style.overflow = "hidden"
        } else {
            currentReader.pause();
            currentElement.icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>'; // Change to play icon
            currentElement.state = false;
            document.querySelector('.description-ovelay').classList.remove('active');
        }

        currentReader.onended = function () {
            status = false;
            currentElement.icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>'; // Change to play icon
            currentElement.state = false;
        }

    }

    document.querySelector('.descrption-close').addEventListener('click', () => {
        document.querySelector('.description-ovelay').classList.remove('active');
        if(currentReader && currentElement) {
            currentReader.pause();
            currentElement.icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>'; // Change to play icon
            currentElement.state = false;
        }

        document.body.style.overflow = "auto"
    });

    function displayDescription(student){
        const studentNameHolder = document.querySelector('.descrption-content .description-header h3');
        const descriptionHolder = document.querySelector('.descrption-content .descripption-view');

        studentNameHolder.textContent = '';
        descriptionHolder.textContent = '';

        studentNameHolder.textContent = student.studentName + ' - (' + student.studentAlias + ')';
        descriptionHolder.textContent = student.studentDescription;
    }

    function shuffleList(arr) {
        if (arr.length <= 1) {
            return arr; // Return the array as-is if it has one or no elements
        }
    
        const fragmentList = [...arr]; // Create a copy of the array to avoid mutating the original
    
        for (let i = fragmentList.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            [fragmentList[i], fragmentList[randomIndex]] = [fragmentList[randomIndex], fragmentList[i]];
        }
    
        return fragmentList; // Return the shuffled array after the loop
    }

    function showMedia(student) {
        let currentIndex = 0;
        const overlay = document.querySelector('.media-overlay');
        const closeBtn = document.querySelector('.media-close');
        const art = document.querySelector('.beatsync-photo');
        const nameEl = document.querySelector('.media-name');
        const quoteEl = document.querySelector('.media-quote');
        const progressBar = document.querySelector('.media-progress span');
        const currentTimeEl = document.querySelector('.media-current');
        const durationEl = document.querySelector('.media-duration');

        if (!overlay) {
            return;
        }

        const photos = student.studentPhotos && student.studentPhotos.length
            ? student.studentPhotos
            : ['logo.png'];

        const formatTime = (value) => {
            if (!Number.isFinite(value) || value < 0) {
                return '0:00';
            }
            const minutes = Math.floor(value / 60);
            const seconds = Math.floor(value % 60).toString().padStart(2, '0');
            return `${minutes}:${seconds}`;
        };

        const setPhoto = (index) => {
            if (art) {
                art.style.backgroundImage = `url('${photos[index]}')`;
                art.classList.remove('is-changing');
                void art.offsetWidth;
                art.classList.add('is-changing');
            }
        };

        if (closeBtn) {
            closeBtn.onclick = () => {
                overlay.classList.remove('active');
                if (currentFavSong) {
                    currentFavSong.pause();
                }
                clearInterval(photoChanger);
                photoChanger = null;
            };
        }

        overlay.classList.add('active');
        setPhoto(currentIndex);

        if (currentFavSong) {
            currentFavSong.pause();
        }

        currentFavSong = new Audio(student.studentFavSong);
        const track = currentFavSong;

        // Clear previous intervals before starting a new one
        if (photoChanger) {
            clearInterval(photoChanger);
            photoChanger = null;
        }

        track.play().catch(() => {});

        if (nameEl) {
            nameEl.textContent = student.studentName;
        }
        if (quoteEl) {
            quoteEl.textContent = student.studentQuote || 'A favourite song from the Class of 2017.';
        }
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        if (currentTimeEl) {
            currentTimeEl.textContent = '0:00';
        }
        if (durationEl) {
            durationEl.textContent = '0:00';
        }

        const updateProgress = () => {
            if (currentFavSong !== track) {
                return;
            }
            const duration = track.duration || 0;
            const progress = duration ? (track.currentTime / duration) * 100 : 0;
            if (progressBar) {
                progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            }
            if (currentTimeEl) {
                currentTimeEl.textContent = formatTime(track.currentTime);
            }
        };

        track.addEventListener('timeupdate', updateProgress);

        // Once the audio metadata is loaded, calculate the change interval
        track.addEventListener('loadedmetadata', function () {
            if (durationEl) {
                durationEl.textContent = formatTime(track.duration);
            }
            if (!Number.isFinite(track.duration) || track.duration <= 0) {
                return;
            }
            const photoChangeInterval = track.duration / photos.length; // Time per photo

            photoChanger = setInterval(() => {
                currentIndex = (currentIndex + 1) % photos.length;
                setPhoto(currentIndex);
            }, photoChangeInterval * 1000); // Convert seconds to milliseconds

            // Stop changing photos when the song ends
            track.addEventListener('ended', () => {
                clearInterval(photoChanger);
                photoChanger = null;
                overlay.classList.remove('active');
            });
        });
    }

    function showLoading(state) {
        document.querySelector('.loading-animation').style.display = state ? "flex" :'none'
        document.querySelector('.loading-animation').classList.toggle('loader', state)
    }

    function playFavSong(student ,state, element) {
        
        if (currentFavSong && currentFavSong.src !== student.studentFavSong) {
            currentFavSong.pause();
            currentFavSong.currentTime = 0; // Reset playback position
        }
        
        currentFavSong = new Audio(student.studentFavSong);
        let reloadInterval;
        let count = 0;

        if(state){
            currentFavSong.play().catch(() => {});
            currentFavSong.addEventListener('loadedmetadata', function () {
                const duration = this.duration;
                const interval = duration / student.studentPhotos.length

                clearInterval(reloadInterval);
                count = 0;

                picChanger = setInterval(function () {
                    currentStudentPhotoIndex = (currentStudentPhotoIndex + 1) % student.studentPhotos.length;
    
                    const img = element.querySelector('.main-content img');
                    img.style.opacity = 0; // Start fade-out animation
                    setTimeout(() => {
                        img.src = student.studentPhotos[currentStudentPhotoIndex];
                        img.style.opacity = 1; // Fade-in after the photo updates
                    }, 500); // Match the fade-out duration in CSS
                }, interval * 1000);

                this.addEventListener('ended', () => {
                    clearInterval(picChanger);
                    currentStudentPhotoIndex = 0;
                    const img = element.querySelector('.main-content img');
                    img.src = student.studentPhotos[currentStudentPhotoIndex];
                    //element.querySelector('.main-content img').src = student.studentPhotos[currentStudentPhotoIndex];
                })
            });

            currentFavSong.addEventListener('waiting', function() {
                showLoading(true);

                reloadInterval = setInterval(() => {
                    count++;
                    if(count >= 5) {
                        window.location.reload();

                    }
                }, 10000);
            });

            currentFavSong.addEventListener('error', function() {
                showLoading(true);
                reloadInterval = setInterval(() => {
                    count++;
                    if(count >= 5) {
                        window.location.reload();
                        
                    }
                }, 30000);
            });

            currentFavSong.addEventListener('stalled', function() {
                showLoading(true);
                reloadInterval = setInterval(() => {
                    count++;
                    if(count >= 5) {
                        window.location.reload();
                        
                    }
                }, 30000);
            });

            currentFavSong.addEventListener('playing', function() {
                showLoading(false);
                clearInterval(reloadInterval);
                count = 0;
            });
        }
        else{
            
            if (currentFavSong) {
                currentFavSong.pause();
                currentFavSong.currentTime = 0;
                clearInterval(picChanger);
            }

            currentStudentPhotoIndex = 0;
            element.querySelector('.main-content img').src = student.studentPhotos[currentStudentPhotoIndex];
        }
    }
    
    
});

