import './createPost.js';
import { Devvit, TriggerContext, useState, useWebView } from '@devvit/public-api';

type DevvitMessage =
  | { type: 'initialData'; data: { username: string; currentCounter: number; cards: { text: string; username: string; votes: number }[]; lastVotedPost: number | null; lastCreatedPost: number | null; hasPostedToday: boolean } }
  | { type: 'updateCounter'; data: { currentCounter: number } }
  | { type: 'cardCreated'; data: { success: boolean; text?: string; username?: string; message?: string } }
  | { type: 'voteRegistered'; data: { success: boolean; message?: string; votedPostIndex?: number } }
  | { type: 'topPostData'; data: { date: string; topPost: { text: string; username: string; votes: number; date: string } | null } }
  | { type: 'monthlyTopPostsData'; data: { year: string; month: string; topPosts: { day: string; text: string; username: string; votes: number }[] } };

export type WebViewMessage = {
  type: 'webViewReady' | 'setCounter' | 'createCard' | 'cardVote' | 'fetchTopPost' | 'fetchMonthlyTopPosts';
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

            // Check if user has already posted today
            const userKey = `user:${username}`;
            const lastPostDate = await context.redis.hGet(userKey, 'lastPostDate');
            const hasPostedToday = lastPostDate === today;

            // Parse cards with votes and usernames
            const cards = cardsForToday ? cardsForToday.split('|').map(card => {
              const [text, username, votes] = card.split('&');
              return {
                text,
                username,
                votes: parseInt(votes || '0')
              };
            }) : [];

            // Fetch the last voted post index
            const lastVotedPost = await context.redis.hGet(userKey, 'lastVotedPost');

            // Fetch the last created post index
            const lastCreatedPost = await context.redis.hGet(userKey, 'lastCreatedPost');

            webView.postMessage({
              type: 'initialData',
              data: {
                username: username,
                currentCounter: 0,
                cards: cards,
                lastVotedPost: lastVotedPost ? parseInt(lastVotedPost) : null,
                lastCreatedPost: lastCreatedPost ? parseInt(lastCreatedPost) : null,
                hasPostedToday: hasPostedToday
              },
            });
            break;

          case 'createCard':
            const date = new Date().toISOString().split('T')[0];
            const userKey1 = `user:${username}`;
            
            // Check if user has already posted today
            const lastPostDate1 = await context.redis.hGet(userKey1, 'lastPostDate');
            if (lastPostDate1 === date) {
              webView.postMessage({
                type: 'cardCreated',
                data: {
                  success: false,
                  message: 'You can only create one post per day.'
                }
              });
              return;
            }

            console.log('Creating new card for date:', date);
            console.log('Text content:', message.data.text);
            
            // Add new card with username and 0 votes
            const existingCards = await context.redis.get(date) || '';
            const newCard = `${message.data.text}&${username}&0`;
            
            const updatedCards = existingCards 
              ? `${existingCards}|${newCard}`
              : newCard;
            
            await context.redis.set(date, updatedCards);
            console.log('Updated cards in Redis:', updatedCards);

            // Update the last created post index
            const newCardIndex = updatedCards.split('|').length - 1;
            await context.redis.hSet(userKey1, { 
              lastPostDate: date,
              lastCreatedPost: newCardIndex.toString() 
            });

            webView.postMessage({
              type: 'cardCreated',
              data: {
                success: true,
                text: message.data.text,
                username: username // Include the username in the response
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
              const [text, username, votes] = cardsList[cardIndex].split('&');
              const newVotes = (parseInt(votes || '0') + 1).toString();
              cardsList[cardIndex] = `${text}&${username}&${newVotes}`;
              
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

            // Fix: Ensure no extra day is subtracted due to timezone issues
            const topPost = await getTopPost(fetchDate, context);
            console.log(`Top post for ${fetchDate}:`, topPost);

            webView.postMessage({
              type: 'topPostData',
              data: {
                date: fetchDate,
                topPost: topPost ? { ...topPost, date: fetchDate } : null
              }
            });
            break;

          case 'fetchMonthlyTopPosts':
            const { year, month } = message.data;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            console.log(`Fetching top posts for month: ${monthKey}`);

            // Fetch the monthly hash from Redis
            const monthlyTopPosts = await context.redis.hGetAll(monthKey);
            const parsedTopPosts = Object.entries(monthlyTopPosts).map(([day, post]) => ({
              day,
              ...JSON.parse(post),
            }));

            webView.postMessage({
              type: 'monthlyTopPostsData',
              data: {
                year,
                month,
                topPosts: parsedTopPosts,
              },
            });
            break;
        }
      },
    });

    return (
      <vstack grow padding="small">
        <button onPress={() => webView.mount()}>Thing Of The Day</button>
      </vstack>
    );
  },
});

Devvit.addSchedulerJob({
  name: 'calculateTopPost',
  onRun: async (event, context) => {
    // Calculate today's date
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    // Get yesterday's date for fetching posts
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    // Get yesterday's posts
    const postsForDate = await context.redis.get(yesterdayKey) || '';
    const posts = postsForDate
      ? postsForDate.split('|').map(post => {
          const [text, username, votes] = post.split('&');
          return { text, username, votes: parseInt(votes || '0') };
        })
      : [];

    // Find top post from yesterday
    const topPost = posts.length
      ? posts.reduce((max, post) => (post.votes > max.votes ? post : max), posts[0])
      : null;

    if (topPost) {
      // Store under yesterday's day in the monthly hash
      const [, , yesterdayDay] = yesterdayKey.split('-');
      await context.redis.hSet(monthKey, { [yesterdayDay]: JSON.stringify(topPost) });
      console.log(`Stored yesterday's (${yesterdayKey}) top post in Redis under ${monthKey}:${yesterdayDay}`);
    }
  }
});

// Add server-side function for fetching top posts
async function getTopPost(date: string, context: Devvit.Context) {
  const [year, month, day] = date.split('-');
  const monthKey = `${year}-${month}`;
  
  try {
    const storedTopPost = await context.redis.hGet(monthKey, day);
    return storedTopPost ? JSON.parse(storedTopPost) : null;
  } catch (error) {
    console.error(`Error fetching top post for ${date}:`, error);
    return null;
  }
}

Devvit.addTrigger({
  event: 'AppInstall', // Trigger when the app is installed
  onEvent: async (event, context) => {
    

    const jobId = await context.scheduler.runJob({
      name: 'calculateTopPost',
      cron: '0 0 * * *', // Runs at 00:00 GMT every day
    });
    
    await createPost(context);
  },
});

async function createPost(context: TriggerContext) {
  const { reddit } = context;
  const subreddit = await reddit.getCurrentSubreddit();
  const post = await reddit.submitPost({
    title: 'Thing Of The Day',
    subredditName: subreddit.name,
    preview: (
      <vstack height="100%" width="100%" alignment="middle center">
        <text size="large">Loading ...</text>
      </vstack>
    ),
  });
  
  // Approve and distinguish the post
  await post.approve();
  await post.distinguish();
}

export default Devvit;
