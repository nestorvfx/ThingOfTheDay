import { Devvit } from '@devvit/public-api';

// Adds a new menu item to the subreddit allowing to create a new post
Devvit.addMenuItem({
  label: 'Create Thing Of The Day Post',
  location: 'subreddit',
  forUserType: 'moderator', // Only moderators can approve and distinguish posts
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'Thing Of The Day',
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ...</text>
        </vstack>
      ),
    });
    
    // First approve the post
    await post.approve();
    
    // Then distinguish the post as a moderator
    await post.distinguish();
    
    ui.showToast({ text: 'Thing Of The Day Post Created and Pinned!' });
    ui.navigateTo(post);
  },
});