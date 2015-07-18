var $j = jQuery;

function StatsFC_Poll(key) {
	this.domain      = 'https://api.statsfc.com';
	this.referer     = '';
	this.key         = key;
	this.question_id = '';

	this.display = function(placeholder) {
		if (placeholder.length == 0) {
			return;
		}

		var $placeholder = $j('#' + placeholder);

		if ($placeholder.length == 0) {
			return;
		}

		if (this.referer.length == 0) {
			this.referer = window.location.hostname;
		}

		var $container = $j('<div>').addClass('statsfc_poll').attr('data-api-key', this.key);

		// Store globals variables here so we can use it later.
		var domain = this.domain;
		var key    = this.key;
		var object = this;

		$j.getJSON(
			domain + '/crowdscores/poll.php?callback=?',
			{
				key:         this.key,
				domain:      this.referer,
				question_id: this.question_id
			},
			function(data) {
				if (data.error) {
					$container.append(
						$j('<p>').css('text-align', 'center').append(
							$j('<a>').attr({ href: 'https://statsfc.com', title: 'Football widgets', target: '_blank' }).text('StatsFC.com'),
							' – ',
							data.error
						)
					);

					return;
				}

				$container.attr('data-question-id', data.question.id);

				var cookie_id = 'statsfc_poll_' + key + '_' + data.question.id;
				var cookie    = statsfc_getCookie(cookie_id);

				if (cookie !== null) {
					cookie = JSON.parse(cookie);
				}

				var $table = $j('<table>');
				var $thead = $j('<thead>');
				var $tbody = $j('<tbody>');

				$thead.append(
					$j('<tr>').append(
						$j('<th>').attr('colspan', 3).text(data.question.title)
					)
				);

				$j.each(data.answers, function(key, answer) {
					var $row = $j('<tr>').attr('data-answer-id', answer.id);

					var $answer = $j('<td>').addClass('statsfc_answer').append(
						$j('<label>').attr('for', 'statsfc_poll_answer_' + answer.id).append(
							$j('<span>').addClass('statsfc_radio'),
							$j('<span>').addClass('statsfc_description').text(answer.description)
						)
					);

					var $votes = $j('<td>').addClass('statsfc_votes');
					var $bar   = $j('<td>').addClass('statsfc_bar');

					if (cookie == null) {
						$answer.find('.statsfc_radio').append(
							$j('<input>').attr({
								type: 'radio',
								name: 'statsfc_poll_' + data.question.id,
								id:   'statsfc_poll_answer_' + answer.id
							}).val(answer.id)
						);
					} else {
						if (answer.votes == data.question.mostVotes) {
							$answer.find('span.statsfc_description').addClass('statsfc_winner');
						}

						$votes.text(statsfc_numberFormat(answer.votes));

						var width = 0;

						if (data.question.mostVotes > 0) {
							width = (100 / data.question.mostVotes * answer.votes);
						}

						$bar.append(
							$j('<span>').addClass('statsfc_votesBar').css('width', width + '%')
						);

						if (cookie == answer.id) {
							$row.addClass('statsfc_highlight');
						}
					}

					$row.append($answer, $votes, $bar);

					$tbody.append($row);
				});

				$table.append($thead, $tbody);

				var $submit = null;

				if (cookie == null) {
					$submit = $j('<p>').addClass('statsfc_submit').append(
						$j('<input>').attr('type', 'submit').val('Vote').on('click', function(e) {
							e.preventDefault();
							object.vote($j(this));
						})
					);
				}

				$container.append($table, $submit);

				if (data.customer.attribution) {
					$container.append(
						$j('<div>').attr('class', 'statsfc_footer').append(
							$j('<p>').append(
								$j('<small>').append('Powered by ').append(
									$j('<a>').attr({ href: 'https://statsfc.com', title: 'StatsFC – Football widgets', target: '_blank' }).text('StatsFC.com')
								)
							)
						)
					);
				}
			}
		);

		$j('#' + placeholder).append($container);
	};

	this.vote = function(e) {
		var $parent	  = e.parents('.statsfc_poll');
		var error     = false;
		var answer_id = $parent.find(':radio:checked').val();

		if (answer_id == null) {
			alert('Please cast your vote!');
			return;
		}

		// Check that cookie doesn't exist for the current match.
		var cookie_id = 'statsfc_poll_' + this.key + '_' + $parent.attr('data-question-id');
		var cookie    = statsfc_getCookie(cookie_id);

		if (cookie !== null) {
			alert('You can only submit one vote');
			return;
		}

		// Submit the ratings to StatsFC.
		$j.getJSON(
			this.domain + '/crowdscores/poll.php?callback=?',
			{
				key:         this.key,
				domain:      window.location.hostname,
				question_id: $parent.attr('data-question-id'),
				answer_id:   answer_id
			},
			function(data) {
				if (data.error) {
					alert(data.error);
					return;
				}

				// Save cookie.
				statsfc_setCookie(cookie_id, answer_id);

				// Update average ratings.
				$j.each(data.answers, function(key, answer) {
					$row = $parent.find('tr[data-answer-id="' + answer.id + '"]');

					if (answer_id == answer.id) {
						$row.addClass('statsfc_highlight');
					}

					if (answer.votes == data.question.mostVotes) {
						$row.find('span.statsfc_description').addClass('statsfc_winner');
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
	};
}

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
