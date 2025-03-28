import './createPost.js';
import { Devvit, useState, useWebView } from '@devvit/public-api';

type DevvitMessage =
  | { type: 'initialData'; data: { username: string; currentCounter: number; cards: { text: string; votes: number }[]; lastVotedPost: number | null; lastCreatedPost: number | null } }
  | { type: 'updateCounter'; data: { currentCounter: number } }
  | { type: 'cardCreated'; data: { success: boolean; text: string } }
  | { type: 'voteRegistered'; data: { success: boolean; message?: string; votedPostIndex?: number } }
  | { type: 'topPostData'; data: { date: string; topPost: { text: string; votes: number; date: string } | null } };

export type WebViewMessage = {
  type: 'webViewReady' | 'setCounter' | 'createCard' | 'cardVote' | 'fetchTopPost';
  data?: any;
};

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addCustomPostType({
  name: 'Card Voting Game',
  height: 'tall',
  render: (context) => {
    // Get current user
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? 'anon';
    });

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'page.html',

      async onMessage(message, webView) {
        switch (message.type) {
          case 'webViewReady':
            const today = new Date().toISOString().split('T')[0];
            console.log('Loading cards for date:', today);

            const cardsForToday = await context.redis.get(today) || '';
            console.log('Retrieved cards:', cardsForToday);

            // Parse cards with votes
            const cards = cardsForToday ? cardsForToday.split('|').map(card => {
              const [text, votes] = card.split('&');
              return {
                text,
                votes: parseInt(votes || '0')
              };
            }) : [];

            // Fetch the last voted post index
            const userVoteKey = `user:${username}`;
            const lastVotedPost = await context.redis.hGet(userVoteKey, 'lastVotedPost');

            // Fetch the last created post index
            const lastCreatedPost = await context.redis.hGet(userVoteKey, 'lastCreatedPost');

            webView.postMessage({
              type: 'initialData',
              data: {
                username: username,
                currentCounter: 0,
                cards: cards,
                lastVotedPost: lastVotedPost ? parseInt(lastVotedPost) : null, // Send the index of the last voted post
                lastCreatedPost: lastCreatedPost ? parseInt(lastCreatedPost) : null // Send the index of the last created post
              },
            });
            break;

          case 'createCard':
            const date = new Date().toISOString().split('T')[0];
            const userKey = `user:${username}`;
            
            console.log('Creating new card for date:', date);
            console.log('Text content:', message.data.text);
            
            // Add new card with 0 votes
            const existingCards = await context.redis.get(date) || '';
            const newCard = `${message.data.text}&0`;
            
            const updatedCards = existingCards 
              ? `${existingCards}|${newCard}`
              : newCard;
            
            await context.redis.set(date, updatedCards);
            console.log('Updated cards in Redis:', updatedCards);

            // Update the last created post index
            const newCardIndex = updatedCards.split('|').length - 1;
            await context.redis.hSet(userKey, { lastCreatedPost: newCardIndex.toString() });

            webView.postMessage({
              type: 'cardCreated',
              data: {
                success: true,
                text: message.data.text
              }
            });
            break;

          case 'cardVote':
            const voteDate = new Date().toISOString().split('T')[0];
            const voteUserKey = `user:${username}`;
            
            // Check if the user has already voted today
            const lastVoteDate = await context.redis.hGet(voteUserKey, 'lastVoteDate');
            if (lastVoteDate === voteDate) {
              const lastVotedPost = await context.redis.hGet(voteUserKey, 'lastVotedPost');
              webView.postMessage({
                type: 'voteRegistered',
                data: {
                  success: false,
                  message: `You can only vote once per day. You already voted for post #${parseInt(lastVotedPost ?? '0') + 1}.`
                }
              });
              return;
            }

            // Update vote count in Redis
            const currentCards = await context.redis.get(voteDate) || '';
            const cardsList = currentCards.split('|');
            const cardIndex = message.data.cardId - 1; // Use the original order index

            if (cardIndex >= 0 && cardIndex < cardsList.length) {
              const [text, votes] = cardsList[cardIndex].split('&');
              const newVotes = (parseInt(votes || '0') + 1).toString();
              cardsList[cardIndex] = `${text}&${newVotes}`;
              
              await context.redis.set(voteDate, cardsList.join('|'));
              console.log('Updated votes in Redis:', cardsList.join('|'));

              // Update user's last vote date and the post they voted for
              await context.redis.hSet(voteUserKey, {
                lastVoteDate: voteDate,
                lastVotedPost: cardIndex.toString()
              });

              webView.postMessage({
                type: 'voteRegistered',
                data: {
                  success: true,
                  votedPostIndex: cardIndex // Send the original index
                }
              });
            }
            break;

          case 'fetchTopPost':
            const fetchDate = message.data.date;
            console.log(`Fetching top post for date: ${fetchDate}`);

            // Fetch posts for the given date
            const postsForDate = await context.redis.get(fetchDate) || '';
            console.log(`Posts retrieved from Redis for ${fetchDate}:`, postsForDate);

            // Parse posts into an array of objects
            const posts = postsForDate
              ? postsForDate.split('|').map(post => {
                  const [text, votes] = post.split('&');
                  return { text, votes: parseInt(votes || '0') };
                })
              : [];
            console.log(`Parsed posts for ${fetchDate}:`, posts);

            // Determine the top post
            const topPost = posts.length
              ? posts.reduce((max, post) => (post.votes > max.votes ? post : max), posts[0])
              : null;
            console.log(`Top post for ${fetchDate}:`, topPost);

            // Send the top post data to the WebView
            webView.postMessage({
              type: 'topPostData',
              data: {
                date: fetchDate,
                topPost: topPost
                  ? { ...topPost, date: fetchDate } // Include the date the post was created
                  : null
              }
            });
            console.log(`Sent top post data to WebView for ${fetchDate}:`, {
              date: fetchDate,
              topPost: topPost
                ? { ...topPost, date: fetchDate }
                : null
            });
            break;
        }
      },
    });

    return (
      <vstack grow padding="small">
        <button onPress={() => webView.mount()}>Open Card Voting Game</button>
      </vstack>
    );
  },
});

Devvit.addTrigger({
  event: 'AppInstall', // Trigger when the app is installed
  onEvent: async (event, context) => {
    console.log('App installed. Populating Redis with random data for the past 10 days.');

    const today = new Date();
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

    for (let i = 1; i <= 10; i++) {
      try {
        const date = new Date(today);
        date.setDate(today.getDate() - i); // Go back `i` days
        const formattedDate = date.toISOString().split('T')[0];

        // Generate random cards for the day
        const randomCards = Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, index) => {
          const randomVotes = Math.floor(Math.random() * 100); // Random votes between 0 and 99
          const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)]; // Random sample text
          return `${randomText}&${randomVotes}`;
        });

        // Validate the generated cards
        if (!randomCards.every(card => /^.+&\d+$/.test(card))) {
          throw new Error(`Invalid card format detected: ${JSON.stringify(randomCards)}`);
        }

        // Join cards into a single string for Redis storage
        const cardsString = randomCards.join('|');

        // Store the random cards in Redis
        await context.redis.set(formattedDate, cardsString);
        console.log(`Populated Redis for ${formattedDate}:`, cardsString);
      } catch (error) {
        console.error(`Error populating Redis for day ${i}:`, error);
      }
    }

    console.log('Redis population complete.');
  },
});

export default Devvit;
