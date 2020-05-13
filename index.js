/**
 * Using Node's support for ECMAScript modules.
 */
'use strict';

import request from 'request';
import cheerio from 'cheerio';
import ical from 'ical-generator';

const calendar_url = 'https://students.ucsd.edu/academics/enroll/calendar20-21.html';

request(calendar_url, function (error, response, body) {

  console.log('statusCode:', response && response.statusCode);
  if (error) {
    console.error('error', error);
    return;
  }

  const $ = cheerio.load(body);

  const calendar_name = 'UC San Diego ' + $('title').text();
  const cal = ical({
    prodId: {
      company: 'students.ucsd.edu',
      product: 'university-cal-generator',
      language: 'EN'
    },
    name: calendar_name
  });

  //const res = $('div[class=body-text]').find('a').attr('href');

  let header = [];

  $('th').each(function () {
    header.push($(this).text());
  })

  $('tr').each(function () {

    if ($(this).children().length == 5) {

      let description, description_html;

      $(this).find('tr > td').each(function (index) {

        if (index === 0) { // Description

          description = $(this).text();
          description = description.replace(/&quot;/g, '\"');
          description = description.replace(/\r?\n|\r/g, '');

          description_html = $(this).html();
          description_html = description_html.replace(/&#xA0\;/g, '');

        } else if (index != 4) { // Add event except for summer quarter

          let date_str = $(this).text();

          if (date_str === 'N/A') {
            return;
          }

          const quarter = header[index];

          date_str = date_str.split('-');
          const startDate_str = date_str[0].split('/');

          const month = parseInt(startDate_str[0], 10) - 1;
          let year = '20' + quarter.substr(quarter.length - 2);

          if (quarter.startsWith('Winter') && month >= 5) year = '2020';
          else if (quarter.startsWith('Spring') && month >= 8) year = '2020';

          let startDate = new Date(year, month, parseInt(startDate_str[1], 10), 23, 59);

          const event = cal.createEvent({
            start: startDate,
            allDay: true,
            //timezone: 'America/Los_Angeles',
            //floating: true,
            summary: quarter + ' ' + description,
            description: description_html,
            organizer: {
              name: 'UC San Diego',
              email: 'q5yu@cs.ucsd.edu'
            },
            status: 'confirmed',
            alarms: [
              { type: 'display', trigger: 900 } // 15 minutes before event
            ]
          });

          if (date_str.length === 2) {
            let endDate_str = date_str[1].split('/');
            let endDate = new Date(year, month, parseInt(endDate_str[1], 10), 23, 59);
            event.end(endDate);
          }
        }
      });
    }
  });

  cal.saveSync(calendar_name + '.ics');

});