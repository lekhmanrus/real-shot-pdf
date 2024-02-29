chrome.runtime.onMessage.addListener((request, sender, respond) => {
  const handler = new Promise((resolve, reject) => {
    if (request) {
      if (request === 'parseLinks') {
        resolve(JSON.stringify({
          action: request,
          links: extractLinks()
        }));
      } else {
        resolve(`Hi from contentPage! You are currently on: ${window.location.href}`);
      }
    } else {
      reject('request is empty.');
    }
  });

  handler
    .then((message) => respond(message))
    .catch((error) => respond(error));

  return true;
});

function extractLinks() {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('a[href]'))
    .map((link) => link.href);
  links.push(window.location.href);
  const uniqueLinks = Array.from(new Set(links));
  return uniqueLinks;
}
