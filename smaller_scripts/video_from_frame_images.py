# This script turns a series of images in a folder into a video file.
import cv2
import os
import re


def images_to_video(image_dir, video_path, fps=24):
    images = [img for img in os.listdir(image_dir) if img.endswith(".png")]

    # Sort images by their number, not by their string representation
    images.sort(key=lambda img: int(re.findall(r'\d+', os.path.splitext(img)[0])[0]))

    # Read the first image to get the dimensions
    frame = cv2.imread(os.path.join(image_dir, images[0]))
    height, width, layers = frame.shape

    # Create a VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

    for image in images:
        frame = cv2.imread(os.path.join(image_dir, image))
        video.write(frame)

    # Release the VideoWriter object
    video.release()

# Example function call:

# image_dir = '3D creations\output_frames'
# video_path = 'output_frames from video.mp4'
# fps = 24  # Set the desired frames per second for the output video
#
# images_to_video(image_dir, video_path, fps)
