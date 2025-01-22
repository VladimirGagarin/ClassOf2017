document.addEventListener("DOMContentLoaded", function () {
    let studentList = [];
    let currentReader = null;
    let currentElement = {
        icon: null,
        element: null,
        state: false
    };

    const LikedStudents = JSON.parse(localStorage.getItem("LikedStudents") || "[]");

    

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
                console.log(data);
                const ArrBefore = [...data];
                const shuffled= shuffleList(ArrBefore);
                studentList = [...shuffled];

                populateStudents();

                setTimeout(function() {
                    document.querySelector('.loading-animation').style.display = 'none';
                },6000)
            })
            .catch((err) => {
                console.error(err);
            });
    })();

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
                       

                        // Populate <li> with student data
                        if (!li.innerHTML && studentList[index]) {
                            const student = studentList[index];
                            let currentImageIndex = 0;

                            li.innerHTML = `
                                <div class="main-content">
                                    <img src="${student.studentPhotos[currentImageIndex]}" alt="Student_${student.studentAdmissionNumber}">
                                </div>
                                <div class="circles">
                                    <div class="circle">&#9654;</div>
                                    <div class="circle">&#10084;</div>
                                    <div class="circle">${student.studentAdmissionNumber}</div>
                                </div>`;

                            // Add event listener to the play button
                            const playButton = li.querySelectorAll('.circles .circle')[0];
                            const likeButton = li.querySelectorAll('.circles .circle')[1];
                            const imagButton = li.querySelectorAll('.circles .circle')[2];

                            

                            const isAlreadyLiked = LikedStudents.some(std => std.studentName === student.studentName);
                            likeButton.classList.toggle('liked', isAlreadyLiked);
                            
                            playButton.onclick = function () {
                                // Check if currentElement is null or undefined and toggle play/pause based on the current state
                                const isCurrentlyPlaying = currentElement && currentElement.state && currentElement.element === li;
                                playDescription(new Audio(student.studentAudioReader), playButton, li, !isCurrentlyPlaying);
                                displayDescription(student);
                            };

                            likeButton.onclick = function () {
                                const isLiked = LikedStudents.some(std => std.studentName === student.studentName);
                        
                                if (isLiked) {
                                    // Remove student from LikedStudents
                                    LikedStudents = LikedStudents.filter(s => s.studentName !== student.studentName);
                                } else {
                                    // Add student to LikedStudents
                                    LikedStudents.push(student);
                                }
                        
                                // Update localStorage and toggle button state
                                localStorage.setItem("LikedStudents", JSON.stringify(LikedStudents));
                                likeButton.classList.toggle('liked', !isLiked);
                            };

                            imagButton.onclick = function() {
                                currentImageIndex = ( currentImageIndex + 1) % student.studentPhotos.length;
                                li.querySelector('.main-content img').src = student.studentPhotos[currentImageIndex];
                            }
                            
                        }

                        const student = studentList[index];
                        document.querySelector('header').style.display = 'flex';
                        document.querySelector('header .title h3').textContent = student.studentName;
                        document.querySelector('main').style.backgroundColor =  student.studentFavColor
                        setTimeout(() => {
                            document.querySelector('header').style.display = 'none';
                        }, 2000);
                    }
                    else {
                        // Handle when element is out of view
                        const li = entry.target;
                        const playButton = li.querySelector('.circles .circle');
                        playButton.innerHTML = '&#9654;'; // Change to play icon when out of view

                        // If currently playing, pause it when out of view
                        if (currentReader && !currentReader.paused) {
                            currentReader.pause();
                            currentReader = null; // Reset currentReader
                            currentElement.state = false;
                        }
                    }
                });
            },
            { root: null, threshold: 0.6 }
        );

        // Observe each <li>
        container.querySelectorAll('li').forEach((li) => observer.observe(li));
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
    
});

