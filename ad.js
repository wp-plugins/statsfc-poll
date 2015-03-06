var $j = jQuery;

$j(function() {
	var $ad      = $j('.statsfc_ad');
	var maxWidth = $ad.width();
	var ads      = [
		[120, 60],
		[234, 60],
		[280, 40],
		[468, 60],
		[728, 90]
	];

	var ad = ads[0];

	for (var i = 1; i < ads.length; i++) {
		if (ads[i][0] <= maxWidth) {
			ad = ads[i];
		}
	}

	$ad.empty().append(
		$j('<iframe>').attr({ src: '//api.statsfc.com/ads/' + ad[0] + 'x' + ad[1] + '.html', width: ad[0], height: ad[1], frameborder: 0, scrolling: 'no' })
	);
});
