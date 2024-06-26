  


/* --------------------------------------------------------------------------
 * Initializing any needed variables
 * --------------------------------------------------------------------------*/

  var lastClosestBlock = null;
  
  
 /* --------------------------------------------------------------------------
 * Prepares the page on document ready. Sets up hover text for elements with 
 * the 'hoverable' class and initializes all media blocks on the page.
 * --------------------------------------------------------------------------*/
 

$(document).ready(function() {
  // Hover text logic
  $(".hoverable").hover(function() {
    var elementText = $(this).find('.hover-text').text();
    $(".cursor-text").text(elementText);
  });

  // Initialize functionality
  initialize();
});
  
$(document).ready(function() {
    setupContainerClickHandler();
});

  
  

  
 /* --------------------------------------------------------------------------
 * Initializes the main functionality for the webpage. Sets up media blocks,
 * throttles scroll and touchmove events for performance, and handles any other
 * page-wide initializations.
 * --------------------------------------------------------------------------*/
 

function initialize() {
  initializeMediaBlocks();
  
  // Throttle scroll and touchmove events to improve performance
  var throttledUpdateCaption = throttle(function() {
    updateContentBasedOnProximity(); // Update captions based on proximity
  }, 100);
  
  $(window).on('scroll touchmove resize', throttledUpdateCaption);

  $('.content-container').on('scroll touchmove', throttledUpdateCaption);

  // Initial update on page load
  // updateContentBasedOnProximity();
}
  
  
  
  
 /* --------------------------------------------------------------------------
 * Limits the rate at which a function can execute. Useful for improving 
 * performance on events that can fire frequently, such as scroll or resize.
 * -------------------------------------------------------------------------*/
 
  
function throttle(func, limit) {
  var lastFunc;
  var lastRan;
  return function() {
    var context = this;
    var args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

  
  
  
  
 /* --------------------------------------------------------------------------
 * Iterates over each media block on the page and sets them up. This function
 * acts as the coordinator for initializing all media-related functionality.
 * -------------------------------------------------------------------------*/
 
  
function initializeMediaBlocks() {
  $(".media-block").each(function(index, block) {
    setupFirstMediaItem(block);
    setupSubsequentMediaItems(block);
  });
}

  
  
  

 /* --------------------------------------------------------------------------
 * Sets up the first media item in a media block. This function handles the 
 * special case of the first media item, which might need to autoplay or be 
 * displayed immediately.
 * -------------------------------------------------------------------------*/
 
  
function setupFirstMediaItem(block) {
  var mediaURLsHtml = $(block).find(".media-urls").html();
  var mediaCaptionsHtml = $(block).find(".media-captions").html();
  var mediaURLs = mediaURLsHtml ? mediaURLsHtml.split("<br><br>") : [];
  var mediaCaptions = mediaCaptionsHtml ? mediaCaptionsHtml.split("<br><br>") : [];
  var mediaContainer = $(block).find('.html-embed.w-embed');

  if(mediaURLs.length > 0) {
    var firstMediaUrl = mediaURLs[0].trim();
    var firstMediaType = getMediaType(firstMediaUrl);
    if(firstMediaType === 'video') {
      var videoElement = $(block).find('video.inside-media').first();
      videoElement.find('source').attr('src', firstMediaUrl);
      videoElement.attr('autoplay', 'true').show();
      initHLS(videoElement.get(0), firstMediaUrl);
      videoElement.get(0).load();
      videoElement.get(0).play().catch(e => console.error("Autoplay failed: ", e));
      showMediaElement(videoElement);
} else if(firstMediaType === 'image') {
  $(block).find('video.inside-media').remove();
  var imgElement = $('<img>', {
    class: 'inside-media',
    src: firstMediaUrl,
    style: 'visibility: hidden; position: absolute;' // Ensure it's initially hidden
  }).appendTo(mediaContainer);
  showMediaElement(imgElement); // Correct usage of showMediaElement
}
    updateCaption(block, mediaCaptions.length > 0 ? mediaCaptions[0].trim() : "");
  }
}

  

  
  
 /* --------------------------------------------------------------------------
 * Adds all subsequent media items after the first one to the media block. This 
 * function handles creating and appending the media elements dynamically based 
 * on their type.
 * -------------------------------------------------------------------------*/
 


function setupSubsequentMediaItems(block) {
  var mediaURLsHtml = $(block).find(".media-urls").html();
  var mediaURLs = mediaURLsHtml ? mediaURLsHtml.split("<br><br>") : [];
  var mediaContainer = $(block).find('.html-embed.w-embed');

  mediaURLs.slice(1).forEach(function(url) {
    var mediaType = getMediaType(url.trim());
    var mediaElement = createMediaElement(mediaType, url.trim());
    if(mediaElement) {
      mediaContainer.append(mediaElement);
      if (mediaType === 'video') {
        initHLS(mediaElement.get(0), url.trim());
      }
    }
  });
}

  
  
  
  
 /* --------------------------------------------------------------------------
 * A quick way to check if the layout is horizontal or not based on inner width 
 * -------------------------------------------------------------------------*/
  
  
  function isHorizontalLayout() {
  return window.innerWidth <= 991; // Adjust the breakpoint as necessary
}

  
  
  

  /* --------------------------------------------------------------------------
 * Adjusts the position of the content stream based on the size of the media
 * in the closest media block to avoid occlusion. It uses a scaling factor to
 * determine the amount of movement.
 * -------------------------------------------------------------------------*/
  
  
function updateMediaMovement(closestBlock) {
  var media = $(closestBlock).find('video:visible, img:visible').first(); // Only consider visible media

  if (isHorizontalLayout()) {
    // For smaller breakpoints (horizontal layout), move content vertically
    if (media.length > 0) {
      var mediaHeight = media.height();
      var scale = 5; // Example scaling factor
      var verticalMovement = mediaHeight / scale;
      $(".content-stream-mega").css('transform', 'translateY(' + verticalMovement + 'px)');
    }
  } else {
    // For larger breakpoints (vertical layout), move content horizontally
    if (media.length > 0) {
      var mediaWidth = media.width();
      var scale = 5; // Example scaling factor
      var horizontalMovement = mediaWidth / scale;
      $(".content-stream-mega").css('transform', 'translateX(' + horizontalMovement + 'px)');
    }
  }

  // If there's no media found, reset the transform
  if (media.length === 0) {
    $(".content-stream-mega").css('transform', '');
  }
}

  
  
  

  
/* --------------------------------------------------------------------------
 * Orchestrates updates related to the media block closest to the viewport center.
 * It updates captions, adjusts content stream opacity, manages media movement,
 * and restarts video playback to reflect the currently focused media content.
 * This function ensures the interface dynamically responds to user scrolling and media interaction.
 * -------------------------------------------------------------------------*/

  
function updateContentBasedOnProximity() {
  var closestBlock = findClosestMediaBlock();
  if (closestBlock) {
    updateCaptionForClosestBlock(closestBlock);
    adjustContentStreamOpacity(closestBlock);
    updateMediaMovement(closestBlock);
    restartVideoInClosestBlock(closestBlock);
  }
}
  
  
  
  
/* --------------------------------------------------------------------------
 * Updates the caption based on the closest media block to the viewport center.
 * It fades out the current caption, updates the content, and then fades it back in.
 * This function ensures the caption displayed matches the most relevant media item.
 * -------------------------------------------------------------------------*/
 
  
  function updateCaptionForClosestBlock(closestBlock) {
  var captionIndex = $(closestBlock).data('current-caption');
  var captionsHtml = $(closestBlock).find(".media-captions").html();
  var captions = captionsHtml ? captionsHtml.split("<br><br>") : [];
  var newCaption = getCaptionFromIndex(captions, captionIndex);

  if ($(".content-stream").html() !== newCaption) {
    $(".content-stream").fadeOut(0, function() {
      $(this).html(newCaption).fadeIn(0);
    });
  }
}

function getCaptionFromIndex(captions, index) {
  var newCaption = ""; // Default to an empty string
  if (typeof index === 'number' && index >= 0 && index < captions.length) {
    newCaption = captions[index].trim(); // Use clicked caption if available
  } else if (captions.length > 0) {
    newCaption = captions[0].trim(); // Use the first caption as default
  }
  return newCaption;
}

  
  
  
  
/* --------------------------------------------------------------------------
 * Adjusts the opacity of the content stream based on the caption visibility.
 * If the closest block is not the first or last, the opacity changes based
 * on whether the new caption is empty or not, affecting content visibility.
 * -------------------------------------------------------------------------*/

  
  function adjustContentStreamOpacity(closestBlock) {
  var allMediaBlocks = $(".media-block");
  var closestIndex = allMediaBlocks.index(closestBlock);
  var isFirstOrLast = closestIndex === 0 || closestIndex === allMediaBlocks.length - 1;
  var newCaption = $(".content-stream").html();

  if (!isFirstOrLast) {
    $(".content-stream-mega").css('opacity', newCaption !== "" ? '1' : '0');
  }
  // Visibility for the first and last item is handled elsewhere
}

  

  
  
  
/* --------------------------------------------------------------------------
 * Resets the closest media block to its initial state when it becomes the primary focus again.
 * This includes restarting the video from the beginning, showing the first media item,
 * and displaying the first caption. It ensures a fresh view experience for returning viewers.
 * -------------------------------------------------------------------------*/
function restartVideoInClosestBlock(closestBlock) {
  if (closestBlock !== lastClosestBlock) {
    // Reset current media item and caption indices to the first item
    $(closestBlock).data('current-media', 0);
    $(closestBlock).data('current-caption', 0);
    
    // Find and hide all media elements, then show the first one
    var mediaElements = $(closestBlock).find('.inside-media');
    hideMediaElement(mediaElements.not(':first'));
    showMediaElement(mediaElements.first());

    // Restart video if it's the first media element
    var firstMediaElement = mediaElements.first();
    if (firstMediaElement.is('video')) {
      firstMediaElement.get(0).currentTime = 0;
      firstMediaElement.get(0).play();
    }
    
    // Update the caption to match the first media item
    var firstCaption = $(closestBlock).find(".media-captions").html().split("<br><br>")[0];
    updateCaption(closestBlock, firstCaption);

    lastClosestBlock = closestBlock; // Update lastClosestBlock to the current closest block
  }
}

  
  
  
  
  


/*-------------------------------------------------------------------------
* Initializes click event handling for media blocks to allow switching between
* media items. It incorporates feedback mechanisms and updates the media
* display and caption in response to user interactions.
* -------------------------------------------------------------------------*/

function setupContainerClickHandler() {
console.log('setupContainerClickHandler called'); // To check if the function is called
    $('.content-container').on('click', function() {
	        console.log('Content container clicked'); // To check if the click event is registered

        var closestBlock = findClosestMediaBlock();
        console.log('Closest block found:', closestBlock); // To see which block is identified as closest

        if (closestBlock) {
            switchToNextMediaItem($(closestBlock));
            playClickFeedback(); 
        }
    });
}









/*-------------------------------------------------------------------------
* Plays a click sound and triggers a vibration to provide tactile feedback
* on media item click, enhancing the user interaction experience.
* -------------------------------------------------------------------------*/

function playClickFeedback() {
  var clickSound = new Audio('https://portfoliofiles.preetdalal.com/ui%20click.wav');
  clickSound.play();
  
  if (navigator.vibrate) {
    navigator.vibrate(10); // Vibrate for 10 milliseconds
  }
}





/*-------------------------------------------------------------------------
* Switches to the next media item within a block, handling the update of
* both the visual media element and the corresponding caption.
* -------------------------------------------------------------------------*/

function switchToNextMediaItem(block) {
    console.log('called function to switching to next media item for block:', block); // Confirm the function is called

  var mediaURLsHtml = $(block).find(".media-urls").html();
  var mediaCaptionsHtml = $(block).find(".media-captions").html();
  var mediaURLs = mediaURLsHtml ? mediaURLsHtml.split("<br><br>") : [];
  var mediaCaptions = mediaCaptionsHtml ? mediaCaptionsHtml.split("<br><br>") : [];
  var currentMediaIndex = $(block).data('current-media');
  var nextMediaIndex = (currentMediaIndex + 1) % mediaURLs.length;

  $(block).data('current-media', nextMediaIndex);
  $(block).data('current-caption', nextMediaIndex);

  var currentMediaElement = $(block).find('.inside-media').eq(currentMediaIndex);
  hideMediaElement(currentMediaElement);

  var nextMediaElement = $(block).find('.inside-media').eq(nextMediaIndex);
  showMediaElement(nextMediaElement);

  if(nextMediaElement.is('video')) {
    nextMediaElement.get(0).play().catch(e => console.error("Attempt to play the next video failed: ", e));
  }
  
  updateCaption(block, mediaCaptions[nextMediaIndex] ? mediaCaptions[nextMediaIndex].trim() : "");
}



  
  
  
  
  /* --------------------------------------------------------------------------
 * Finds the media block that is closest to the center of the viewport, to 
 * determine which caption to display in the .content-stream element.
 * -------------------------------------------------------------------------*/
  
  
function findClosestMediaBlock() {
    console.log('findclosestmediablock called'); //cnsole

    var scrollPos = $(window).scrollTop();
    var viewportCenter = $(window).height() / 2 + scrollPos;

    var closestBlock = null;
    var closestDiff = Infinity;

    $(".media-block").each(function() {
        var elementCenter = $(this).offset().top + $(this).outerHeight() / 2;
        var diff = Math.abs(elementCenter - viewportCenter);


        if (diff < closestDiff) {
            closestDiff = diff;
            closestBlock = this;
        }
    });

    console.log('The closest block is:', closestBlock); // Final closest block
    return closestBlock;
}

  
  

 /* --------------------------------------------------------------------------
 * Creates and returns a media element (video or image) based on the given type 
 * and URL. This helper function streamlines the process of adding media to the DOM.
 * -------------------------------------------------------------------------- */

  
function createMediaElement(mediaType, url) {
  // existing code
  var mediaStyle = 'visibility: hidden; position: absolute;'; // Add position absolute to take it out of document flow
  if(mediaType === 'video') {
    return $('<video>', {
      class: 'inside-media',
      playsinline: true,
      muted: true,
      loop: true,
      autoplay: true,
      style: mediaStyle
    }).append($('<source>', {src: url, type: 'application/x-mpegURL'}));
  } else if(mediaType === 'image') {
    return $('<img>', {
      class: 'inside-media',
      src: url,
      style: mediaStyle
    });
  }
  return null;
}
  
  
  

  
 /*--------------------------------------------------------------------------
 * Updates the caption for the current media block. Shows the caption if one 
 * exists or hides the caption container if there's no caption to display.
 * -------------------------------------------------------------------------*/
 
  
function updateCaption(mediaBlock, caption) {
  var captionContainer = $('.content-stream'); // Target the global container directly
  console.log("Updating caption to:", caption); // Debugging line
  if (caption && caption.trim() !== "") {
    captionContainer.text(caption).fadeIn(550);
  } else {
    console.log("No caption found or caption is empty.");
    captionContainer.hide();
  }
}
  
  
  
 /* --------------------------------------------------------------------------
 * Functions to quickly hide and show elements. 
 * Choosing to use this over display none so it doesnt flicker on safari.
 * -------------------------------------------------------------------------- */
  
  function showMediaElement(mediaElement) {
    // Check if the media element is a video and if it is currently not visible
  if (mediaElement.is('video') && mediaElement.css('visibility') === 'hidden') {
    mediaElement.get(0).currentTime = 0; // Reset video time to start
    mediaElement.get(0).play(); // Start playing the video
  }
    
  mediaElement.css('visibility', 'visible').animate({opacity: 1}, 0);
}

function hideMediaElement(mediaElement) {
  mediaElement.animate({opacity: 0}, 0, function() {
    $(this).css('visibility', 'hidden');
  });
}

  
  
 /* --------------------------------------------------------------------------
 * Determines the type of media based on the file extension in the URL. Used to 
 * decide how to handle different media types (e.g., video vs image).
 * -------------------------------------------------------------------------- */
  

function getMediaType(url) {
  if (url.match(/\.(jpeg|jpg|gif|png)$/i)) return 'image';
  if (url.match(/\.(m3u8|mp4)$/i)) return 'video';
  return null; // Default case for unrecognized media type
}
  
  
  

  
 /*-------------------------------------------------------------------------
 * Initializes HLS (HTTP Live Streaming) for video elements when supported. This 
 * function ensures that live streaming videos can be played in the browser.
 * -------------------------------------------------------------------------*/
  

function initHLS(videoElement, src) {
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(videoElement);
    videoElement.play();
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    videoElement.src = src;
    videoElement.addEventListener('loadedmetadata', function() {
      videoElement.play();
    });
  }
}



/*-------------------------------------------------------------------------
 * On click of Email button, copies to clipboard and plays fun sound
 * -------------------------------------------------------------------------*/  
  
document.addEventListener('DOMContentLoaded', (event) => {
    // Initialize the copy sound
    var copySound = new Audio('https://portfoliofiles.preetdalal.com/copy.wav'); 
    
    // Function to copy email to clipboard
    function copyEmailToClipboard(email) {
        const textArea = document.createElement('textarea');
        textArea.value = email;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('Copy');
        textArea.remove();
    }
    
    // Function to play sound effect
    function playCopySound() {
        copySound.play();
    }
    
    // Add click event listener to the element with the combo class
    const buttons = document.querySelectorAll('.conclusion-item-button.hoverable.email');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            copyEmailToClipboard('preetoshi@hey.com');
            playCopySound(); // Play the copy sound effect instead of the click sound
        });
    });
});
  
  
  
  

/*-------------------------------------------------------------------------
* Creates an overlay modal that when clicked, goes to full screen
* -------------------------------------------------------------------------*/

  
document.addEventListener('DOMContentLoaded', function() {
    var overlay = document.querySelector('.mobile-overlay'); // Select the overlay by class

    // Function to open full screen mode
    function openFullscreen(elem) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
        }
    }

    // Listen for a click on the overlay to trigger full screen and hide the overlay
    overlay.addEventListener('click', function() {
        openFullscreen(document.documentElement); // Request full screen for the entire document
        this.style.display = 'none'; // Hide the overlay
    });

    // Detect when leaving full screen mode and show the overlay again
    document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement) {
            overlay.style.display = 'flex'; // Show the overlay when exiting full screen
        }
    }, false);
});


  


/*-----------------------------------------------------
Begin bhaiType
* ----------------------------------------------------*/


// Enter strings, div to target, speed, and delay between lines 
bhaiType([
" ",
" ",
"Hey!",
"I'm Preetoshi",
"I like design that's ...",
"minimal",
"playful",
"and mindfully made.",
], "text-stream", 110, 1300)




  
  
/*-----------------------------------------------------
Bind mouse movements to mobile device tilt with accelerometer
* ----------------------------------------------------*/

function handleOrientation(event) {
  var width = window.innerWidth;
  var height = window.innerHeight;
  var centerX = width / 2;
  var centerY = height / 2;

  var X_SENSITIVITY = 2;
  var Y_SENSITIVITY = 4;
  var X_OFFSET = 0;
  var Y_OFFSET = -0.33; // Assuming a comfortable viewing angle of ~30 degrees as the 'neutral' position

  // Adjust gamma and beta to set a 'neutral' orientation
  var x = event.gamma; // No change needed for gamma, as holding the phone on its side is still considered neutral
  var y = event.beta - 30; // Adjust beta by 30 degrees to set the neutral position

  // Clamp x and y to ensure they don't go beyond the expected range
  x = Math.max(-90, Math.min(90, x));
  y = Math.max(-90, Math.min(90, y)); // Assuming the same range for y for simplicity

  // Convert degrees to a value between 0 and width/height of the window
  var clientX = centerX + (centerX * x / 90) * X_SENSITIVITY + X_OFFSET;
  var clientY = centerY + (centerY * y / 90) * Y_SENSITIVITY + Y_OFFSET;

  // Dispatch a new mousemove event with the calculated positions
  document.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: clientX,
    clientY: clientY
  }));
}

// Add the device orientation event listener
window.addEventListener('deviceorientation', handleOrientation, true);
