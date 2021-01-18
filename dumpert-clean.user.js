// ==UserScript==
// @name         Dumpert cleaner
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Get rid of negative comments on Dumpert. Discussions about what should be banned and should not be, will be ignored.
// @author       Wybren Koelmans
// @match        https://www.dumpert.nl/*
// @downloadURL  https://github.com/WybrenKoelmans/dumpert-clean/raw/main/dumpert-clean.user.js
// @grant        none
// ==/UserScript==

/* jshint esversion: 6 */

const bannedWords = ['complot', 'wappie', 'vaccin', 'n.+afrika', 'blank', 'autochtone', 'volk', 'kans.*parel', 'dit soort volk', 'Android', 'fin', 'reclame', 'finnen', 'finse', 'homo', 'wolla', 'Marokko', 'Marokaan', 'Turk', 'Erdogan', 'weggejorist' ,'neger', 'jood', 'joden', 'hoer', 'bontkraag', 'bondkraag', 'nektasje', 'BLM', '\\*\\*\\*'];

let badWords = 0;
let lowScore = 0;

function filterComments(comments) {
    const filtered = comments.filter((c) => {
        if (typeof c.child_comments !== 'undefined') {
            c.child_comments = filterComments(c.child_comments);
        }
        if (c.kudos_count < 0) {
            lowScore++;
            return false;
        }
        if (new RegExp(bannedWords.join("|"), 'i').test(c.display_content)) {
            badWords++;
            return false;
        }

        return true;
    });
    return filtered;
}

(()=>{
    console.log('Creating `fetch` proxy...');

    const x = window.fetch;
    window.fetch = (...args) => {
        const intercept = new Promise(async (resolve, reject) => {
           try {
               const response = await x(...args);
               if (response.url.includes('/api/v1.1/articles/')) {
                   const json = await response.json();
                   json.data.comments = filterComments(json.data.comments);
                   console.log({
                       badWords,
                       lowScore,
                   });

                   const newBody = JSON.stringify(json);
                   resolve(new Response(newBody, {status: response.status, statusText: response.statusText, headers: response.headers}));

                   const reportElement = document.createElement('div');
                   reportElement.innerHTML = `Filtered ${badWords} bad words comments, ${lowScore} low score comments`;
                   setTimeout(() => {
                       const commentsHeader = document.querySelector('div[class^="comments__header"]');
                       if (commentsHeader) {
                           commentsHeader.append(reportElement);
                       }
                   }, 250);
                   return;
               }
               resolve(response);
           } catch (error) {
               console.error(error);
               reject(error);
           }
        });

       return intercept;
    };

    console.log('`fetch` proxied!');
})();
