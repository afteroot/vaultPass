/* global browser */

async function mainLoaded() {
  var resultList = document.getElementById('resultList');
  var currentUrl;

  var tabs = await browser.tabs.query({ active: true, currentWindow: true });
  for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
    var tab = tabs[tabIndex];
    if (tab.url) {
      currentUrl = tab.url;
      break;
    }
  }

  var vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  if (!vaultToken || vaultToken.length === 0) {
    let message = 'No Vault-Token information available\nPlease use the options page to login';
    var notify = document.getElementById('notify');
    notify.innerText = message;
    notify.style = 'color: red;';
    return;
  }

  var vaultServerAdress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;

  var secretList = (await browser.storage.sync.get('secrets')).secrets;
  if (!secretList) {
    secretList = [];
  }
  resultList.textContent = '';

  var promises = [];
  for (const secret of secretList) {
    promises.push((async function () {
      var secretsInPath = await fetch(`${vaultServerAdress}/v1/secret/metadata/vaultPass/${secret}`, {
        method: 'LIST',
        headers: {
          'X-Vault-Token': vaultToken,
          'Content-Type': 'application/json'
        },
      });
      for (const element of (await secretsInPath.json()).data.keys) {
        var pattern = new RegExp(element);
        var patternMatches = pattern.test(currentUrl);
        if (patternMatches) {
          const urlPath = `${vaultServerAdress}/v1/secret/data/vaultPass/${secret}${element}`;
          const credentials = await getCredentials(urlPath);
          addCredentials(credentials.data.data, element, resultList);
        }
      }
    })());
  }
  await Promise.all(promises);
}

function addCredentials(credentials, credentialName, list) {
  var item = document.createElement('li');
  item.classList.add('mdl-list__item');
  item.classList.add('mdl-list__item--three-line');
  item.addEventListener('click', function () {
    fillCredentialsInBrowser(credentials.username, credentials.password);
  });
  var primaryContent = document.createElement('button');
  item.appendChild(primaryContent);
  primaryContent.classList.add('mdl-list__item-primary-content');
  primaryContent.classList.add('mdl-button');
  primaryContent.classList.add('mdl-js-button');
  primaryContent.classList.add('mdl-button--raised');
  primaryContent.classList.add('mdl-js-ripple-effect');
  var titleContent = document.createElement('span');
  primaryContent.appendChild(titleContent);
  if (credentials.title) {
    titleContent.innerHTML = credentials.title;
  } else {
    titleContent.innerHTML = credentialName;
  }

  var detailContent = document.createElement('span');
  primaryContent.appendChild(detailContent);
  detailContent.classList.add('mdl-list__item-text-body');
  detailContent.innerHTML = `${credentials.username} - ${credentials.password}`;
  list.appendChild(item);
}

async function getCredentials(urlPath) {
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  const result = await fetch(urlPath, {
    headers: {
      'X-Vault-Token': vaultToken,
      'Content-Type': 'application/json'
    },
  });
  if (!result.ok) {
    throw new Error(`getCredentials: ${await result.text}`);
  }
  return await result.json();
}

async function fillCredentialsInBrowser(username, password) {
  var tabs = await browser.tabs.query({ active: true, currentWindow: true });
  for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
    var tab = tabs[tabIndex];
    if (tab.url) {
      // tabs.sendMessage(integer tabId, any message, optional object options, optional function responseCallback)

      browser.tabs.sendMessage(tab.id, { message: 'fill_creds', username: username, password: password });
      break;
    }
  }
}

document.addEventListener('DOMContentLoaded', mainLoaded, false);