var $j = jQuery;

$j(function() {
	$j('.statsfc_poll .statsfc_submit input:submit').click(function(e) {
		e.preventDefault();

		var $parent	  = $j(this).parents('.statsfc_poll');
		var error     = false;
		var answer_id = $parent.find(':radio:checked').val();

		if (answer_id == null) {
			alert('Please cast your vote!');
			return;
		}

		// Check that cookie doesn't exist for the current poll
		var api_key     = $parent.attr('data-api-key');
		var question_id = $parent.attr('data-question-id');
		var cookie_id   = 'statsfc_poll_' + api_key + '_' + question_id;
		var cookie      = statsfc_getCookie(cookie_id);

		if (cookie !== null) {
			alert('You can only submit one vote');
			return;
		}

		// Submit the ratings to StatsFC
		$j.getJSON(
			'https://api.statsfc.com/crowdscores/poll.php?callback=?',
			{
				key:         api_key,
				domain:      window.location.hostname,
				question_id: question_id,
				answer_id:   answer_id
			},
			function(data) {
				if (data.error) {
					alert(data.error);
					return;
				}

				// Save cookie
				statsfc_setCookie(cookie_id, answer_id);

				// Update average ratings
				$j.each(data.answers, function(key, answer) {
					$row = $parent.find('tr[data-answer-id="' + answer.id + '"]');

					if (answer_id == answer.id) {
						$row.addClass('statsfc_highlight');
					}

					$row.find('.statsfc_radio').remove();

					$row.find('.statsfc_votes').text(statsfc_numberFormat(answer.votes));

					var width = (100 / data.question.mostVotes * answer.votes);

					$row.find('.statsfc_bar').append(
						$j('<span>').addClass('statsfc_votesBar').css('width', width + '%')
					);
				});

				$parent.find('.statsfc_submit').remove();
			}
		);
	});
});

function statsfc_setCookie(name, value)
{
	var date = new Date();

	date.setTime(date.getTime() + (28 * 24 * 60 * 60 * 1000));

	var expires = '; expires=' + date.toGMTString();

	document.cookie = escape(name) + '=' + escape(value) + expires + '; path=/';
}

function statsfc_getCookie(name)
{
	var nameEQ = escape(name) + "=";
	var ca     = document.cookie.split(';');

	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];

		while (c.charAt(0) == ' ') {
			c = c.substring(1, c.length);
		}

		if (c.indexOf(nameEQ) == 0) {
			return unescape(c.substring(nameEQ.length, c.length));
		}
	}

	return null;
}

function statsfc_numberFormat(number)
{
	number += '';

	var regex = /(\d+)(\d{3})/;

	while (regex.test(number)) {
		number = number.replace(regex, '$1,$2');
	}

	return number;
}
