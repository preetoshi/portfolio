
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
    setupMediaItemClickHandler(block);
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
 * Restarts the video within the closest media block if it has changed since the last check.
 * This function is called during scrolling or when the media changes, ensuring that
 * videos in close proximity to the viewport's center automatically replay from the start.
 * -------------------------------------------------------------------------*/

  function restartVideoInClosestBlock(closestBlock) {
  if (closestBlock !== lastClosestBlock) {
    var closestVideo = $(closestBlock).find('video.inside-media').first();
    if (closestVideo.length > 0) {
      closestVideo.get(0).currentTime = 0;
      closestVideo.get(0).play();
    }
    lastClosestBlock = closestBlock; // Update lastClosestBlock to the current closest block
  }
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

  
  
  
  
  
 /* --------------------------------------------------------------------------
 * Sets up click event handling for media blocks to enable switching between 
 * media items. This includes showing the next media item and attempting to play 
 * it if it's a video.
 * --------------------------------------------------------------------------*/
 
  
function setupMediaItemClickHandler(block) {
  var clickSound = new Audio('https://portfoliofiles.preetdalal.com/ui%20click.wav'); // Adjust the path as necessary

  var mediaURLsHtml = $(block).find(".media-urls").html();
  var mediaCaptionsHtml = $(block).find(".media-captions").html();
  var mediaURLs = mediaURLsHtml ? mediaURLsHtml.split("<br><br>") : [];
  var mediaCaptions = mediaCaptionsHtml ? mediaCaptionsHtml.split("<br><br>") : [];

  // Check if there's only one media item; if so, no need to setup click handling for transitions
  if (mediaURLs.length <= 1) {
    return; // Early return to prevent setting up click handlers for single-item blocks
  }

  $(block).data('current-media', 0).on('click', function() {
    clickSound.play(); // Play the click sound effect

    var currentMediaIndex = $(this).data('current-media');
    var nextMediaIndex = (currentMediaIndex + 1) % mediaURLs.length;
    $(this).data('current-media', nextMediaIndex);
    $(this).data('current-caption', nextMediaIndex);

    var currentMediaElement = $(this).find('.inside-media').eq(currentMediaIndex);
    hideMediaElement(currentMediaElement);

    var nextMediaElement = $(this).find('.inside-media').eq(nextMediaIndex);
    showMediaElement(nextMediaElement);

    if(nextMediaElement.is('video')) {
      nextMediaElement.get(0).play().catch(e => console.error("Attempt to play the next video failed: ", e));
    }

    var newCaption = mediaCaptions[nextMediaIndex] ? mediaCaptions[nextMediaIndex].trim() : "";
    updateCaption(block, newCaption);
  });
}
  
  
  
  
  
  /* --------------------------------------------------------------------------
 * Finds the media block that is closest to the center of the viewport, to 
 * determine which caption to display in the .content-stream element.
 * -------------------------------------------------------------------------*/
  
  
function findClosestMediaBlock() {
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