# Thing of the Day - Card Voting Game

## Overview

**Thing of the Day** is an interactive card voting game designed for Reddit communities. The app allows users to create, vote, and view the most popular posts for a given day. It is built to enhance community engagement by enabling users to share their thoughts and vote on their favorite submissions.

### Key Features
- **Create Cards**: Users can create cards with custom text.
- **Vote on Cards**: Each user can vote for one card per day.
- **Top Post Overlay**: Displays the most popular card for a selected date.
- **Calendar View**: Navigate through days to view or interact with past posts.
- **Dynamic Sorting**: Sort cards by highest or lowest votes.
- **Responsive Design**: Optimized for both desktop and mobile devices.

---

## Technical Details

### Architecture
The app is built using **Devvit**, a platform for creating Reddit apps. It leverages both client-side and server-side capabilities to provide a seamless and interactive experience.

### Core Components
1. **Frontend**:
   - **HTML**: Provides the structure for the app, including modals, overlays, and the calendar.
   - **CSS**: Defines the styling, ensuring a modern and responsive design.
   - **JavaScript**: Handles user interactions, such as creating cards, voting, and navigating the calendar.

2. **Backend**:
   - **Devvit API**: Manages app logic, including Redis integration for data storage and retrieval.
   - **Redis**: Used for storing card data, votes, and user-specific metadata (e.g., last voted post).

3. **WebView**:
   - The app uses a WebView to render the frontend and communicate with the backend using a message-passing system.

---

## File Structure

### Key Files
- **`src/main.tsx`**:  
  The main entry point for the app. Handles backend logic, including Redis operations, message handling, and app triggers.

- **`webroot/page.html`**:  
  The HTML structure for the app's WebView, including modals for creating cards, viewing the calendar, and displaying the top post.

- **`webroot/style.css`**:  
  Contains all the styles for the app, ensuring a clean and responsive design.

- **`webroot/script.js`**:  
  Handles client-side logic, such as rendering cards, managing user interactions, and communicating with the backend.

- **`Devvit Documentation.txt`**:  
  A detailed guide on how Devvit apps work, including permissions, configurations, and supported features.

---

## Installation and Setup

### Prerequisites
- **Node.js**: Ensure you have Node.js installed on your system.
- **Devvit CLI**: Install the Devvit CLI using the following command:
  ```bash
  npm install -g @devvit/cli
  ```

### Steps to Run the App
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd thingoftheday
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the app:
   ```bash
   devvit playtest <your-test-subreddit>
   ```

4. Open the app in your test subreddit to interact with it.

---

## Features in Detail

### 1. **Card Creation**
   - Users can create cards with a maximum of 128 characters.
   - Cards are stored in Redis with a default vote count of 0.

### 2. **Voting System**
   - Each user can vote for one card per day.
   - Votes are stored in Redis, and the user's last voted post is tracked to prevent multiple votes.

### 3. **Top Post Overlay**
   - Displays the most popular card for a selected date.
   - Includes the card's text, vote count, and creation date.

### 4. **Calendar Navigation**
   - Users can navigate through a calendar to view posts from previous days.
   - The calendar dynamically adjusts to screen sizes for better usability.

### 5. **Sorting**
   - Cards can be sorted by highest or lowest votes using a dropdown menu.

---

## Technical Highlights

### Redis Integration
- **Data Storage**: Cards and votes are stored in Redis, ensuring fast and scalable data access.
- **User Metadata**: Tracks user-specific data, such as the last voted post and last created post.

### WebView Communication
- **Message Passing**: The frontend and backend communicate using a structured message-passing system.
- **Event Handling**: Backend processes events like `createCard`, `cardVote`, and `fetchTopPost` to update Redis and send responses to the WebView.

### Responsive Design
- The app is fully responsive, with styles optimized for both desktop and mobile devices.
- Uses CSS media queries to adjust layouts and font sizes based on screen dimensions.

---

## Development Notes

### App Triggers
- **AppInstall Trigger**: Populates Redis with random data for the past 10 days when the app is installed.

### Error Handling
- Ensures robust error handling for Redis operations and user interactions.
- Displays toast messages for invalid actions, such as attempting to vote multiple times in a day.

### Logging
- Extensive logging is implemented to track data flow and debug issues during development.

---

## Future Enhancements
- **Server-Side Rendering**: Split code into server and client portions for better performance and security.
- **Advanced Analytics**: Add analytics to track user engagement and voting patterns.
- **Custom Themes**: Allow subreddit moderators to customize the app's appearance.

---

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your message here"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a pull request.

---

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Support
For questions or issues, please contact the developer or open an issue in the repository.
