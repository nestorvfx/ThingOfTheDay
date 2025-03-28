/** @typedef {import('../src/message.ts').DevvitSystemMessage} DevvitSystemMessage */
/** @typedef {import('../src/message.ts').WebViewMessage} WebViewMessage */

class App {
  constructor() {
    // Get references to the HTML elements
    document.addEventListener('DOMContentLoaded', () => {
      // Touch event handling for mobile devices
      let touchStartX = 0;
      let touchEndX = 0;

      function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchEndX - touchStartX;
        
        if (Math.abs(diff) > swipeThreshold) {
          if (diff > 0) {
            // Swipe right - Previous month
            currentMonth--;
            if (currentMonth < 0) {
              currentMonth = 11;
              currentYear--;
            }
          } else {
            // Swipe left - Next month
            currentMonth++;
            if (currentMonth > 11) {
              currentMonth = 0;
              currentYear++;
            }
          }
          generateCalendar(currentYear, currentMonth);
        }
      }

      // Add touch event listeners to calendar
      document.getElementById('calendarModal').addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      });

      document.getElementById('calendarModal').addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
      });

      // Sample data
      const sampleTexts = [
        "The best way to predict the future is to invent it.",
        "Simplicity is the ultimate sophistication.",
        "You miss 100% of the shots you don't take.",
        "It does not matter how slowly you go as long as you do not stop.",
        "The journey of a thousand miles begins with one step.",
        "The only limit to our realization of tomorrow will be our doubts of today.",
        "Genius is 1% inspiration, 99% perspiration.",
        "Success is not final, failure is not fatal: It is the courage to continue that counts.",
        "I have not failed. I've just found 10,000 ways that won't work.",
        "Life is 10% what happens to you and 90% how you react to it."
      ];

      let cards = [];
      let selectedCardId = null; // Tracks the currently selected card

      // Generate initial cards
      function generateInitialCards() {
        // Instead of using sample data, render empty state if no cards
        if (!cards || cards.length === 0) {
          const cardGrid = document.getElementById('cardGrid');
          cardGrid.innerHTML = `
            <div class="empty-state">
              <p>Nothing has been posted yet.</p>
              <p>Be the first to share something today!</p>
            </div>`;
          return;
        }
        renderCards();
      }

      // Render all cards
      function renderCards() {
        const cardGrid = document.getElementById('cardGrid');
        cardGrid.innerHTML = '';

        const hasVoted = cards.some(card => card.isVoted); // Check if the user has already voted

        cards.forEach(card => {
          const cardElement = document.createElement('div');
          cardElement.className = `card ${card.isVoted ? 'voted' : ''} ${card.isCreatedByUser ? 'created-by-user' : ''}`;
          cardElement.dataset.id = card.id;

          const checkmark = document.createElement('div');
          // Only show the checkmark if the user hasn't voted yet
          const isVisible = !hasVoted && (card.id === selectedCardId || card.isVoting);
          checkmark.className = `checkmark ${isVisible ? 'visible' : ''}`;
          checkmark.innerHTML = '<span class="icon">✓</span>';

          const voteCount = document.createElement('div');
          voteCount.className = 'vote-count';
          voteCount.textContent = card.votes;

          const cardText = document.createElement('div');
          cardText.className = 'card-text';
          cardText.textContent = card.text;

          cardElement.appendChild(checkmark);
          cardElement.appendChild(voteCount);
          cardElement.appendChild(cardText);

          if (card.isCreatedByUser) {
            const createdByBadge = document.createElement('div');
            createdByBadge.className = 'created-by-badge';
            createdByBadge.textContent = 'You Created This';
            cardElement.appendChild(createdByBadge);
          }

          cardGrid.appendChild(cardElement);
        });

        document.querySelectorAll('.card').forEach(card => {
          card.addEventListener('click', handleCardClick);
        });
        document.querySelectorAll('.checkmark').forEach(checkmark => {
          checkmark.addEventListener('click', handleCheckmarkClick);
        });
      }

      // Handle card click (selecting the card)
      function handleCardClick(e) {
        const cardId = parseInt(e.currentTarget.dataset.id);
        const card = cards.find(c => c.id === cardId);

        // Check if the user has already voted
        if (cards.some(c => c.isVoted)) {
          // If the clicked card is not the highlighted one, show a toast message
          if (!card.isVoted) {
            showToast('You can only vote once per day.');
          }
          return; // Prevent further actions
        }

        if (selectedCardId !== cardId) {
          selectedCardId = cardId;
          renderCards();
        }
      }

      // Handle checkmark click (casting the vote)
      function handleCheckmarkClick(e) {
        e.stopPropagation();
        const cardId = parseInt(e.currentTarget.parentElement.dataset.id);
        const card = cards.find(c => c.id === cardId);

        // Prevent voting for other cards if a vote has already been cast
        if (cards.some(c => c.isVoted)) {
          // Show toast message immediately
          showToast('You can only vote once per day.');
          return;
        }

        if (card && !card.isVoting && !card.isVoted) {
          // Send vote message to Devvit
          postWebViewMessage({
            type: 'cardVote',
            data: { cardId }
          });

          // Update vote count immediately
          card.votes += 1;
          card.isVoting = true;
          card.isVoted = true;

          renderCards();

          setTimeout(() => {
            card.isVoting = false;
            renderCards();
          }, 1000);
        }
      }

      // Helper function to show a toast message
      function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.classList.add('visible');
        }, 10);

        setTimeout(() => {
          toast.classList.remove('visible');
          setTimeout(() => {
            toast.remove();
          }, 300);
        }, 3000);
      }

      // Sort cards
      function sortCards(direction) {
        if (direction === 'highest') {
          cards.sort((a, b) => b.votes - a.votes);
        } else {
          cards.sort((a, b) => a.votes - b.votes);
        }
        renderCards();
      }

      // Create a new card
      function createNewCard(text) {
        console.log('Creating new card with text:', text);
        postWebViewMessage({
          type: 'createCard',
          data: { text }
        });
      }

      // Helper function to format numbers to 4 characters
      function formatNumber(num) {
        if (num >= 10000) {
          return Math.floor(num / 1000) + 'k';
        } else {
          return num.toString().padStart(4, ' ');
        }
      }

      // Generate calendar with daily updates and adaptive layout
      function generateCalendar(year, month) {
        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = ''; // Clear existing content
        
        // Screen size detection
        const isSmallScreen = window.innerWidth <= 480;
        const isVerySmallScreen = window.innerWidth <= 320 || window.innerHeight <= 500;
        const isSquareAspectRatio = window.innerWidth / window.innerHeight <= 1.1;
        
        // Add day-of-week headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
          const dayHeader = document.createElement('div');
          dayHeader.className = 'calendar-day day-header';
          // Use shorter headers on small screens
          dayHeader.textContent = isSmallScreen ? day.charAt(0) : day;
          calendarGrid.appendChild(dayHeader);
        });
        
        // Calculate key dates
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday
        const daysInMonth = new Date(year, month + 1, 0).getDate(); // Days in current month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate(); // Days in previous month
        
        // Calculate if we need 6 rows (42 cells) or can use 5 rows (35 cells)
        const totalWeeks = Math.ceil((firstDay + daysInMonth) / 7);
        const totalDayCells = totalWeeks * 7;
        
        // Add previous month's days
        for (let i = 0; i < firstDay; i++) {
          const dayNumber = daysInPrevMonth - firstDay + 1 + i;
          const emptyDay = document.createElement('div');
          emptyDay.className = 'calendar-day inactive';
          const dayContent = document.createElement('div');
          dayContent.className = 'day-content';
          dayContent.innerHTML = `<div class="day-number">${dayNumber}</div>`;
          emptyDay.appendChild(dayContent);
          calendarGrid.appendChild(emptyDay);
        }
        
        // Add current month's days with daily updates
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dayElement = document.createElement('div');
          dayElement.className = 'calendar-day selectable';
          if (year === currentYear && month === currentMonth && i === currentDate) {
            dayElement.classList.add('today');
          }
          const dayContent = document.createElement('div');
          dayContent.className = 'day-content';
          dayContent.innerHTML = `<div class="day-number">${i}</div>`;
          
          // Add daily update if the day is on or before the current date
          const showUpdate = (year < currentYear) ||
                            (year === currentYear && month < currentMonth) ||
                            (year === currentYear && month === currentMonth && i <= currentDate);
          if (showUpdate) {
            const randomNum = Math.floor(Math.random() * 50001); // 0 to 50,000
            const formattedNum = formatNumber(randomNum);
            
            // Simplified display for small screens
            if (isVerySmallScreen) {
              dayContent.innerHTML += `<div class="day-number-formatted">${formattedNum}</div>`;
            } else if (isSmallScreen || isSquareAspectRatio) {
              // More compact display for small screens
              dayContent.innerHTML += `<div class="day-number-formatted">${formattedNum}</div>`;
            } else {
              // Full display for larger screens
              dayContent.innerHTML += `
                <div class="day-text">Daily update</div>
                <div class="day-number-formatted">${formattedNum}</div>
              `;
            }
          }
          
          dayElement.appendChild(dayContent);
          calendarGrid.appendChild(dayElement);

          // Add click event to display top post overlay
          dayElement.addEventListener('click', () => {
            const selectedDate = new Date(year, month, i).toISOString().split('T')[0];
            displayTopPostOverlay(selectedDate);
          });
        }
        
        // Add next month's days to fill the grid
        const addedDayCells = firstDay + daysInMonth;
        const nextMonthCells = totalDayCells - addedDayCells;
        for (let i = 1; i <= nextMonthCells; i++) {
          const nextMonthDay = document.createElement('div');
          nextMonthDay.className = 'calendar-day inactive';
          const dayContent = document.createElement('div');
          dayContent.className = 'day-content';
          dayContent.innerHTML = `<div class="day-number">${i}</div>`;
          nextMonthDay.appendChild(dayContent);
          calendarGrid.appendChild(nextMonthDay);
        }
        
        // Update month and year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;
      }

      function displayTopPostOverlay(date) {
        const overlay = document.getElementById('topPostOverlay');
        const overlayContent = document.getElementById('topPostContent');
        overlayContent.innerHTML = ''; // Clear previous content

        // Fetch top post for the selected date
        postWebViewMessage({
          type: 'fetchTopPost',
          data: { date }
        });
      }

      // Close overlay
      document.getElementById('closeTopPostOverlay').addEventListener('click', () => {
        document.getElementById('topPostOverlay').classList.remove('active');
      });

      // Initialize with current date
      let currentDateObj = new Date();
      let currentYear = currentDateObj.getFullYear();
      let currentMonth = currentDateObj.getMonth();

      // Event Listeners
      document.getElementById('createBtn').addEventListener('click', () => {
        document.getElementById('createModal').classList.add('active');
        // Reset counter when modal opens
        const textArea = document.getElementById('cardText');
        textArea.value = '';
        updateCharacterCount(textArea);
      });

      document.getElementById('closeCreateModal').addEventListener('click', () => {
        document.getElementById('createModal').classList.remove('active');
      });

      // Add character count display and limit
      function updateCharacterCount(textarea) {
        const maxLength = 128;
        const currentLength = textarea.value.length;
        const remaining = maxLength - currentLength;
        const countDisplay = document.getElementById('characterCount');
        countDisplay.textContent = `${currentLength}/${maxLength} characters`;
        
        if (currentLength > maxLength) {
          textarea.value = textarea.value.substring(0, maxLength);
          countDisplay.style.color = 'red';
        } else {
          countDisplay.style.color = '';
        }
      }

      document.getElementById('cardText').addEventListener('input', function() {
        updateCharacterCount(this);
      });

      document.getElementById('saveCardBtn').addEventListener('click', () => {
        const text = document.getElementById('cardText').value.trim();
        if (text && text.length <= 128) {
          createNewCard(text);
          document.getElementById('cardText').value = '';
          document.getElementById('createModal').classList.remove('active');
        }
      });

      document.getElementById('calendarBtn').addEventListener('click', () => {
        generateCalendar(currentYear, currentMonth);
        document.getElementById('calendarModal').classList.add('active');
      });

      document.getElementById('closeCalendarBtn').addEventListener('click', () => {
        document.getElementById('calendarModal').classList.remove('active');
      });

      document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        generateCalendar(currentYear, currentMonth);
      });

      document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        generateCalendar(currentYear, currentMonth);
      });

      document.getElementById('sortBtn').addEventListener('click', (e) => {
        const dropdown = document.getElementById('sortDropdown');
        dropdown.classList.toggle('active');
        e.stopPropagation();
      });

      document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const sortDirection = item.dataset.sort;
          sortCards(sortDirection);
          document.getElementById('sortDropdown').classList.remove('active');
        });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#sortDropdown') && !e.target.closest('#sortBtn')) {
          document.getElementById('sortDropdown').classList.remove('active');
        }
      });

      // Close dropdown on scroll for mobile
      window.addEventListener('scroll', () => {
        document.getElementById('sortDropdown').classList.remove('active');
      });

      // Handle touch events outside dropdown
      document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('#sortDropdown') && !e.target.closest('#sortBtn')) {
          document.getElementById('sortDropdown').classList.remove('active');
        }
      });


      document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('active');
          }
        });
      });

      // Add message handler
      window.addEventListener('message', (event) => {
        const message = event.data;
        console.log('Received message:', message);
        
        if (message.type === 'devvit-message') {
          const devvitMessage = message.data.message;
          console.log('Processing Devvit message:', devvitMessage);

          switch (devvitMessage.type) {
            case 'initialData':
              // Use received cards data with votes
              const cardsData = devvitMessage.data.cards;
              const lastVotedPost = devvitMessage.data.lastVotedPost;
              const lastCreatedPost = devvitMessage.data.lastCreatedPost;
              console.log('Initial cards data:', cardsData);
              console.log('Last voted post index:', lastVotedPost);
              console.log('Last created post index:', lastCreatedPost);

              cards = cardsData.map((card, index) => ({
                id: index + 1,
                text: card.text,
                votes: card.votes || 0,
                isVoting: false,
                isVoted: index === lastVotedPost, // Highlight the previously voted card
                isCreatedByUser: index === lastCreatedPost // Highlight only the latest card created by the user
              }));

              console.log('Processed cards:', cards);
              generateInitialCards();
              break;

            case 'voteRegistered':
              if (!devvitMessage.data.success) {
                alert(devvitMessage.data.message); // Show toast message
              } else {
                const votedPostIndex = devvitMessage.data.votedPostIndex;
                cards.forEach((card, index) => {
                  card.isVoted = index === votedPostIndex; // Highlight the correct card
                  card.isVoting = false; // Disable voting for all cards
                });
                renderCards();
              }
              break;

            case 'cardCreated':
              if (devvitMessage.data.success) {
                console.log('Card created successfully:', devvitMessage.data.text);

                // Reset "isCreatedByUser" for all cards
                cards.forEach(card => card.isCreatedByUser = false);

                // Add the new card and mark it as created by the user
                cards.push({
                  id: cards.length + 1,
                  text: devvitMessage.data.text,
                  votes: 0,
                  isVoting: false,
                  isVoted: false,
                  isCreatedByUser: true
                });

                renderCards();
                document.getElementById('createModal').classList.remove('active');
                document.getElementById('cardText').value = '';
              } else {
                console.error('Failed to create card:', devvitMessage.data);
              }
              break;

            case 'topPostData':
              const { date, topPost } = devvitMessage.data;
              console.log(`Received topPostData message for date ${date}:`, topPost);

              const overlay = document.getElementById('topPostOverlay');
              const overlayContent = document.getElementById('topPostContent');

              if (topPost) {
                console.log(`Displaying top post for ${date}:`, topPost);
                overlayContent.innerHTML = `
                  <div class="top-post-details">
                    <p class="top-post-text">${topPost.text}</p>
                    <p class="top-post-meta">
                      <span><strong>Votes:</strong> ${topPost.votes}</span>
                      <span><strong>Date:</strong> ${date}</span>
                    </p>
                  </div>
                `;
              } else {
                console.log(`No posts found for ${date}. Displaying message.`);
                overlayContent.innerHTML = `
                  <div class="top-post-details no-post">
                    <p class="top-post-message">No posts were made on this day.</p>
                  </div>
                `;
              }

              // Ensure the overlay is visible only after content is set
              overlay.classList.add('active');
              console.log(`Top post overlay displayed for ${date}`);
              break;
          }
        }
      });

      // On load, notify Devvit we're ready
      postWebViewMessage({ type: 'webViewReady' });

      // Initialize the app
      generateInitialCards();
    });
  };
}

/**
 * Sends a message to the Devvit app.
 * @arg {WebViewMessage} msg
 * @return {void}
 */
function postWebViewMessage(msg) {
  parent.postMessage(msg, '*');
}

new App();
