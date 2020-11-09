function makeBookmarksArray() {
  return [
    {
      id: 1,
      title: 'Youtube',
      url: 'https://www.youtube.com',
      description: 'Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.',
      rating: 5,
    },
    {
      id: 2,
      title: 'Reddit',
      url: 'https://www.reddit.com',
      description: 'Reddit is a network of communities based on peoples interests. Find communities youre interested in, and become part of an online community!',
      rating: 4,
    },
    {
      id: 3,
      title: 'Twitter',
      url: 'https://twitter.com/?lang=en',
      description: 'From breaking news and entertainment to sports and politics, get the full story with all the live commentary.',
      rating: 3,
    },
  ];
}

function makeMaliciousBookmark() {
  const maliciousBookmark= {
    id: 911,
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    url: 'https://www.fakeWebsite.com',
    description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
    rating: 5
  }
  const expectedBookmark = {
    ...maliciousBookmark,
    title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return {
    maliciousBookmark,
    expectedBookmark,
  }
}


module.exports = {
  makeBookmarksArray,
  makeMaliciousBookmark,
}