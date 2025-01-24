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

    const LikedStudents = JSON.parse(localStorage.getItem("LikedStudents") || "[]");
    let picChanger;
    let  photoChanger;
    

    document.documentElement.scrollTop = 0; // For modern browsers
    document.body.scrollTop = 0; // For older browsers or compatibility


    // Fetch data
    (function () {
        fetch('students.json')
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to load data");
                }
                return response.json();
            })
            .then((data) => {
                
                const ArrBefore = [...data];
                const shuffled= shuffleList(ArrBefore);
                studentList = [...shuffled];


                setTimeout(function() {
                    document.querySelector('.loading-animation button').disabled = false;
                },6000)
            })
            .catch((err) => {
                console.error(err);
            });
    })();


    document.querySelector('.loading-animation button').onclick = function () {
        this.disabled = true;
        document.querySelector('.loading-animation').style.display = 'none'
        populateStudents()
    }

    // Create empty <li> elements
    function populateStudents() {
        const studentContainer = document.querySelector('main .student-container ul');
        if (studentList.length === 0) {
            return;
        }

        studentList.forEach(() => {
            const li = document.createElement('li'); // Create empty <li>
            studentContainer.appendChild(li);
        });

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
                        

                        li.innerHTML = `
                            <div class="main-content">
                                <img src="${student.studentPhotos[currentImageIndex]}" alt="Student_${student.studentAdmissionNumber}">
                            </div>
                            <div class="circles">
                                 <div class="circle"><i class="fas fa-volume-up"></i></div>
                                <div class="circle">&#9654;</div>
                                <div class="circle">&#10084;</div>
                                <div class="circle">${student.studentAdmissionNumber}</div>
                                <div class="circle">&#9835;</div>
                            </div>`;

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
                            currentElement.element.querySelector('.main-content img').src = student.studentPhotos[currentStudentPhotoIndex];
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

                            muteButton.innerHTML = isFavSongMuted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-up"></i>'
                        }
                    }

                    const student = studentList[index];
                    setTimeout(() => {
                        document.querySelector('header').style.display = 'flex';
                    }, 2000);
                    document.querySelector('header .title h3').textContent = student.studentName;
                    document.querySelector('main').style.backgroundColor = student.studentFavColor;
                    setTimeout(() => {
                        document.querySelector('header').style.display = 'none';
                    }, 5000);

                    playFavSong(student, true, li);
                } else {
                    // Handle when element is out of view
                    if (currentElement) {
                        const student = currentElement.student;
                        const li = currentElement.element;
                        playFavSong(student, false, li);
                        currentFavSong = null;
                        picChanger = null;
                        isFavSongMuted = false;
                        const  muteButton = li.querySelectorAll('.circles .circle')[0];
                        muteButton.innerHTML = isFavSongMuted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-up"></i>'
                        

                    }
                }
            });
        },
        { root: null, threshold: 0.6 }
    );

    // Observe each <li>
    container.querySelectorAll('li').forEach((li) => observer.observe(li));

    // Manually handle the first student
    const firstLi = container.querySelector('li');
    if (firstLi && studentList[0]) {
        const student = studentList[0];
        playFavSong(student, true, firstLi);
        // Populate the first student's data if necessary
        if (!firstLi.innerHTML) {
            firstLi.innerHTML = `
                <div class="main-content">
                    <img src="${student.studentPhotos[0]}" alt="Student_${student.studentAdmissionNumber}">
                </div>
                <div class="circles">
                    <div class="circle"><i class="fas fa-volume-up"></i></div>
                    <div class="circle">&#9654;</div>
                    <div class="circle">&#10084;</div>
                    <div class="circle">${student.studentAdmissionNumber}</div>
                    <div class="circle">&#9835;</div>
                </div>`;

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
                    currentElement.element.querySelector('.main-content img').src = student.studentPhotos[currentStudentPhotoIndex];
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
            currentElement.icon.innerHTML = '&#9654;'; // Change to play icon
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
            currentElement.icon.innerHTML = '&#9654;'; // Change to play icon
            currentElement.state = false;
            document.querySelector('.description-ovelay').classList.remove('active');
        }

        currentReader.onended = function () {
            status = false;
            currentElement.icon.innerHTML = '&#9654;'; // Change to play icon
            currentElement.state = false;
        }

    }

    document.querySelector('.descrption-close').addEventListener('click', () => {
        document.querySelector('.description-ovelay').classList.remove('active');
        if(currentReader && currentElement) {
            currentReader.pause();
            currentElement.icon.innerHTML = '&#9654;'; // Change to play icon
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
        const quoteContent = document.querySelector('.quote-content');
    
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            if(currentFavSong) {
                currentFavSong.pause();
            }

            clearInterval(photoChanger);
        });
    
        function showOverlay() {
            overlay.classList.add('active');
        }
    
        showOverlay();
        document.querySelector('.media-content').style.backgroundImage = `url('${student.studentPhotos[currentIndex]}')`;
    
        currentFavSong = new Audio(student.studentFavSong);
        
        // Clear previous intervals before starting a new one
        if (photoChanger) {
            clearInterval(photoChanger);
        }

        currentFavSong.play();

        quoteContent.innerHTML = `<h3>${student.studentName}</h3><p>${student.studentQuote}</p>`
    
        // Once the audio metadata is loaded, calculate the change interval
        currentFavSong.addEventListener('loadedmetadata', function () {
            const duration = currentFavSong.duration; // Total duration of the song
            const photoChangeInterval = duration / student.studentPhotos.length; // Time per photo
    
            photoChanger = setInterval(() => {
                currentIndex = (currentIndex + 1) % student.studentPhotos.length;
                document.querySelector('.media-content').style.backgroundImage = `url('${student.studentPhotos[currentIndex]}')`;
            }, photoChangeInterval * 1000); // Convert seconds to milliseconds
    
            // Stop changing photos when the song ends
            currentFavSong.addEventListener('ended', () => {
                clearInterval(photoChanger);
                overlay.classList.remove('active');
            });
        });
    }

    function showLoading(state) {
         document.querySelector('.loading-animation').style.display = state ? "flex" :'none'
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
            currentFavSong.play();
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
                    element.querySelector('.main-content img').src = student.studentPhotos[currentStudentPhotoIndex];
                })
            });

            currentFavSong.addEventListener('waiting', function() {
                showLoading(true);

                reloadInterval = setInterval(() => {
                    count++;
                    if(count >= 5) {
                        window.location.reload();

                    }
                }, 1000);
            });

            currentFavSong.addEventListener('error', function() {
                showLoading(true);
                reloadInterval = setInterval(() => {
                    count++;
                    if(count >= 5) {
                        window.location.reload();
                        
                    }
                }, 1000);
            });

            currentFavSong.addEventListener('stalled', function() {
                showLoading(true);
                reloadInterval = setInterval(() => {
                    count++;
                    if(count >= 5) {
                        window.location.reload();
                        
                    }
                }, 1000);
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

