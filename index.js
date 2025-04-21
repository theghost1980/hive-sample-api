const express = require('express');
const dhive = require('@hiveio/dhive');
const moment = require('moment');

const app = express();
const port = 4000;

const client = new dhive.Client(['https://api.hive.blog', 'https://api.deathwing.me']);

/**
 * Converts raw reputation value to human-readable format.
 */
function calculateReputation(rawReputation) {
  if (rawReputation == null) {
    return 0;
  }
  let log = Math.log10(Math.abs(rawReputation));
  let reputation = Math.max(log - 9, 0);
  if (rawReputation < 0) {
    reputation = reputation * -1;
  }
  reputation = (reputation * 9) + 25;
  return parseFloat(reputation.toFixed(2));
}

// API Endpoint to find spanish posts from the last 6 days with specific criteria
app.get('/find-spanish-posts-last-6-days', async (req, res) => {
  const targetTag = 'spanish';
  const minReputation = 25;
  const maxReputation = 45;
  const maxVotes = 5;
  const timeWindowDays = 6;

  const sixDaysAgo = moment.utc().subtract(timeWindowDays, 'days');

  // Fetching only a limited number of recent posts might not
  // retrieve *all* posts from the last 6 days if there are many in that period.
  const initialFetchLimit = parseInt(req.query.initialFetchLimit) || 20; // Default and max limit per call

   if (initialFetchLimit <= 0 || initialFetchLimit > 20) {
       return res.status(400).json({ error: `initialFetchLimit must be between 1 and 20 (due to node limitations).` });
   }


  console.log(`Searching for "${targetTag}" posts from the last ${timeWindowDays} days, by authors with reputation ${minReputation}-${maxReputation}, and <= ${maxVotes} votes.`);
  console.log(`Workspaceing initial ${initialFetchLimit} recent posts with tag "${targetTag}"...`);


  try {
    const recentPosts = await client.database.getDiscussions('created', {
      tag: targetTag,
      limit: initialFetchLimit,
    });

    console.log(`Workspaceed ${recentPosts ? recentPosts.length : 0} recent posts.`);


    if (!recentPosts || recentPosts.length === 0) {
      return res.json({ message: `No recent posts found with tag "${targetTag}" in the initial fetch.`, posts: [] });
    }

    const potentialAuthors = [...new Set(recentPosts.map(post => post.author))];

    console.log(`Workspaceing account details for ${potentialAuthors.length} potential authors...`);
    const accounts = await client.database.getAccounts(potentialAuthors);
    console.log(`Received ${accounts ? accounts.length : 0} account details.`);

    const authorReputationMap = new Map();
    accounts.forEach(account => {
      authorReputationMap.set(account.name, calculateReputation(account.reputation));
    });

    const filteredPosts = recentPosts.filter(post => {
      const postTimestamp = moment.utc(post.created);
      const reputation = authorReputationMap.get(post.author);

      // Treat undefined net_votes as 0 for filtering purposes
      const netVotes = post.net_votes === undefined ? 0 : post.net_votes;

      const passedFilter = postTimestamp.isAfter(sixDaysAgo) &&
                           reputation >= minReputation &&
                           reputation <= maxReputation &&
                           netVotes <= maxVotes;

      return passedFilter;
    });

    console.log("Finished filtering.");

    const formattedPosts = filteredPosts.map(post => ({
        title: post.title,
        author: post.author,
        permlink: post.permlink,
        created: post.created,
        url: `https://peakd.com/@${post.author}/${post.permlink}`,
        author_reputation: authorReputationMap.get(post.author),
        net_votes: post.net_votes,
        pending_payout_value: post.pending_payout_value,
        total_pending_payout_value: post.total_pending_payout_value,
    }));


    res.json({
        tag: targetTag,
        timeWindowDays: timeWindowDays,
        minReputation: minReputation,
        maxReputation: maxReputation,
        maxVotes: maxVotes,
        initialFetchLimit: initialFetchLimit,
        requestedInitialFetchLimit: req.query.initialFetchLimit ? parseInt(req.query.initialFetchLimit) : initialFetchLimit,
        foundPosts: formattedPosts.length,
        posts: formattedPosts
        });

  } catch (error) {
    console.error('Error searching for posts:', error);
    console.error(error);
    res.status(500).json({ error: 'An error occurred while searching for posts.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Hive Spanish Post Search API listening at http://localhost:${port}`);
});