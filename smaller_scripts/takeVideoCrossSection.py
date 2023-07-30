# Given: a video, 3 coordinates representing a plane in 3D space, and the plane dimensions,
# we output a 2D "cross-section" of the video (imagining time as a spatial dimension which the plane intersects).
# To save processing power, we calculate the pixel dimensions and frames we need to sample from *before* loading the
# video, so that we won't have to "rewind" the video.

import json
import cv2
import os
import re
import numpy as np
from PIL import Image, PngImagePlugin
import datetime
import sys

# This bit is for profiling the code; comment out before release
import cProfile, pstats, io
# End of profiling code segment

# ## Check our location in the computer for troubleshooting
# print(os.getcwd()) # get current working directory
# # Get the relative path
# relative_path = __file__
# print("Relative path:", relative_path)

# # Get the absolute path
# absolute_path = os.path.abspath(__file__)
# print("Absolute path:", absolute_path)

# # Get the directory containing the script
# script_dir = os.path.dirname(absolute_path)
# print("Script directory:", script_dir)


# We only need three coordinate points to define the input rectangle: the top left point `p1`, the top left point `p2`,
# and a bottem left point `p3`. We can then calculate the fourth point internally.
def create_cross_section(video_path, points, resolutions, outputName):
    # Convert relative path to absolute path
    absolute_video_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), video_path))

    print('Attempting to open video file at path:', absolute_video_path)
    # Check if file exists
    if not os.path.isfile(absolute_video_path):
        raise Exception(f"Video file does not exist: {absolute_video_path}")
    else:
        print('file exists!')
        
    # Get the original video's dimensions and duration (in frames)
    # print('Attempting to open video file at path:', video_path)
    cap = cv2.VideoCapture(absolute_video_path)
    if not cap.isOpened():
        raise Exception("Could not open `" + absolute_video_path +  "`. Check to make sure the file actually exists, and is in .mp4 format")
    
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    duration = cap.get(cv2.CAP_PROP_FRAME_COUNT)

    # Unpack corner points and resolutions (meaning the number of points to have spaced evenly inside the plane)
    p1, p2, p3 = points
    width_res, height_res = resolutions
    print('width_res: ', width_res, ', height_res: ', height_res)

    # Convert points and resolutions from three.js space to original video space
    # List of points
    point_list = [p1, p2, p3]
    # Scaling factors
    scaling_factors = [width / 100, height / 100, duration / 100]
    # Scale the points
    for point in point_list:
        for i in range(3):
            point[i] *= scaling_factors[i]
    # Make resolutions relative to plane
    width_res = int(width_res * width / 100)
    height_res = int(height_res * height / 100)

    # Check if the resolutions are greater than zero
    if width_res <= 0 or height_res <= 0:
        print('width: ', width, ', height: ', height)
        raise Exception("Resolutions must be greater than zero")

    # Calculate width and height vectors
    width_vector = [(p2[i] - p1[i]) / width_res for i in range(3)]
    height_vector = [(p3[i] - p1[i]) / height_res for i in range(3)]

    # Initialize image array with appropriate dimensions
    image = np.zeros((height_res, width_res, 3))

    # Create a list of pixel coordinates and their original positions
    coords = []
    for i in range(height_res):
        for j in range(width_res):
            # Calculate the center of the current segment and round them to the nearest whole number
            center = [round(p1[k] + (j + 0.5) * width_vector[k] + (i + 0.5) * height_vector[k]) for k in range(3)]
            # Add the center and its original position to the list
            coords.append((center, (i, j)))

    # Sort the list by the z-coordinate
    coords.sort(key=lambda n: n[0][2])

    # Frame index
    frame_index = -1

    # Iterate over sorted list
    for center, original_pos in coords:
        # If the coordinates are out of bounds, fill with black
        if center[2] < 0 or center[2] >= duration or center[0] < 0 or center[0] >= width or center[1] < 0 or center[
            1] >= height:
            image[original_pos] = [0, 0, 0]
            continue

        # If the frame index doesn't match with the z-coordinate of the current pixel,
        # read frames until it does
        while frame_index < center[2]:
            ret, frame = cap.read()
            if not ret:
                raise Exception("Couldn't read video")
            frame_index += 1

        # Convert x, y to integers as they represent pixel positions
        x, y = map(int, center[:2])

        # Add pixel color to image at the original position
        image[original_pos] = frame[y, x]

    # Convert BGR to RGB
    image = cv2.cvtColor(image.astype(np.uint8), cv2.COLOR_BGR2RGB)

    # Create a PIL image
    pil_image = Image.fromarray(image)

    # Create metadata with PngInfo object
    meta = PngImagePlugin.PngInfo()
    meta.add_text("Description", ("Coordinates of TIMECUBE cross-section: " + outputName))

    # Save the image with added metadata
    pil_image.save(outputName, pnginfo=meta)

    # Save the image
    pil_image.save(outputName)


# # Example of a `create_cross_section()` function call:
#
# # Arrays represent top left, top right, and bottom left points of image/plane, respectively
# points = [[51.787123933939604, -1.2069462425104982, -7.17036082012239],
#           [104.91694554306812, 21.7691466321827, 74.38618749385326],
#           [54.622052382430184, 67.39184842565481, 9.830320134079496]]
#
# resolutionPercentage = [100, 100]  # percent (out of 100) resolution of image
#
# # video = "C:/Users/yitzi/Downloads/ezgif.com-gif-to-mp4.mp4"
# video = "C:/Users/yitzi/Downloads/iCloud Photos from Yitzi Litt/iCloud Photos from Yitzi Litt/Aryeh moving towards me.MP4"
#
# output_name = str(points) + '.png'
#
# create_cross_section(video, points, resolutionPercentage, output_name)


def create_animation(video_path, points_start, points_end, resolutions, num_steps, output_base_name):
    # Convert relative path to absolute path
    absolute_video_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), video_path))

    print('Attempting to open video file at path:', absolute_video_path)
    # Check if file exists
    if not os.path.isfile(absolute_video_path):
        raise Exception(f"Video file does not exist: {absolute_video_path}")
    else:
        print('file exists!')
        
    # Get the original video's dimensions and duration (in frames)
    # print('Attempting to open video file at path:', video_path)
    cap = cv2.VideoCapture(absolute_video_path)
    if not cap.isOpened():
        raise Exception("Could not open `" + absolute_video_path +  "`. Check to make sure the file actually exists, and is in .mp4 format")
    
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    duration = cap.get(cv2.CAP_PROP_FRAME_COUNT)

    # Unpack corner points and resolutions
    # Note that we only need three coordinate points to define the input rectangle: the top left point `p1`, the top left point `p2`,
    # and a bottem left point `p3`. We can then calculate the fourth point internally.
    # Input coordinates may be negative and/or floating-point.
    p1_start, p2_start, p3_start = points_start
    p1_end, p2_end, p3_end = points_end
    width_res, height_res = resolutions

    # Convert points and resolutions from three.js space to original video space
    # List of points
    point_lists = [[p1_start, p2_start, p3_start], [p1_end, p2_end, p3_end]]
    # Scaling factors
    scaling_factors = [width / 100, height / 100, duration / 100]
    # Scale the points
    for point_list in point_lists:
        for point in point_list:
            for i in range(3):
                point[i] *= scaling_factors[i]
    # Make resolutions relative to plane
    width_res = int(width_res * width / 100)
    height_res = int(height_res * height / 100)

    # Initialize a list to store pixel data and their positions for each step
    frames_data = []

    # Generate interpolated points and get pixel data
    for step in range(num_steps):
        # Calculate interpolation factor
        t = step / (num_steps - 1)
        # Interpolate points
        p1 = [p1_start[i] * (1 - t) + p1_end[i] * t for i in range(3)]
        p2 = [p2_start[i] * (1 - t) + p2_end[i] * t for i in range(3)]
        p3 = [p3_start[i] * (1 - t) + p3_end[i] * t for i in range(3)]

        # Calculate width and height vectors
        width_vector = [(p2[i] - p1[i]) / width_res for i in range(3)]
        height_vector = [(p3[i] - p1[i]) / height_res for i in range(3)]

        # Initialize list for this frame's data
        frame_data = []

        # Create a list of pixel coordinates and their original positions
        coords = []
        for i in range(height_res):
            for j in range(width_res):
                # Calculate the center of the current segment
                center = [p1[k] + (j + 0.5) * width_vector[k] + (i + 0.5) * height_vector[k] for k in range(3)]
                center_rounded = [round(c) for c in center]
                # Add the center and its original position to the list
                coords.append((center_rounded, (i, j)))

        # Sort the list by the z-coordinate
        coords.sort(key=lambda n: n[0][2])

        # Add the coordinates and their original positions for this step to the frames_data list
        frames_data.append(coords)

    # Now we'll get all necessary pixel data in one run as we go through the video
    # Initialize a frame index
    frame_index = -1

    # Initialize a list to store images for each step
    images = [np.zeros((height_res, width_res, 3)) for _ in range(num_steps)]

    # Iterate over all the sorted pixel coordinates
    for center, original_pos, step in sorted(
            ((center, original_pos, step) for step, coords in enumerate(frames_data) for center, original_pos in
             coords), key=lambda x: x[0][2]):

        # If the frame index doesn't match with the z-coordinate of the current pixel,
        # read frames until it does
        while frame_index < center[2]:
            ret, frame = cap.read()
            if not ret:
                raise Exception("Couldn't read video")
            frame_index += 1

        # If the coordinates are out of bounds, fill with black
        if center[2] < 0 or center[2] >= duration or center[0] < 0 or center[0] >= width or center[1] < 0 or center[
            1] >= height:
            images[step][original_pos] = [0, 0, 0]
            continue

        # Convert x, y to integers as they represent pixel positions
        x, y = map(int, center[:2])

        # Add pixel color to the image for the current step at the original position
        images[step][original_pos] = frame[y, x]

    # Save the images
    for step, image in enumerate(images):
        # Convert BGR to RGB
        image = cv2.cvtColor(image.astype(np.uint8), cv2.COLOR_BGR2RGB)

        # Create a PIL image
        pil_image = Image.fromarray(image)

        # Save the image
        pil_image.save(f"{output_base_name}_{step}.png")


def create_animation_optimized(video_path, points_start, points_end, resolutions, num_steps, output_base_name):
    # Convert relative path to absolute path
    absolute_video_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), video_path))

    print('Attempting to open video file at path:', absolute_video_path)
    # Check if file exists
    if not os.path.isfile(absolute_video_path):
        raise Exception(f"Video file does not exist: {absolute_video_path}")
    else:
        print('file exists!')
        
    # Get the original video's dimensions and duration (in frames)
    # print('Attempting to open video file at path:', video_path)
    cap = cv2.VideoCapture(absolute_video_path)
    if not cap.isOpened():
        raise Exception("Could not open `" + absolute_video_path +  "`. Check to make sure the file actually exists, and is in .mp4 format")
    
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    duration = cap.get(cv2.CAP_PROP_FRAME_COUNT)

    # Unpack corner points and resolutions
    # Note that we only need three coordinate points to define the input rectangle: the top left point `p1`, the top left point `p2`,
    # and a bottem left point `p3`. We can then calculate the fourth point internally.
    # Input coordinates may be negative and/or floating-point.
    p1_start, p2_start, p3_start = points_start
    p1_end, p2_end, p3_end = points_end
    width_res, height_res = resolutions

    # Convert points and resolutions from three.js space to original video space
    # List of points
    point_lists = [[p1_start, p2_start, p3_start], [p1_end, p2_end, p3_end]]
    # Scaling factors
    scaling_factors = [width / 100, height / 100, duration / 100]
    # Scale the points
    for point_list in point_lists:
        for point in point_list:
            for i in range(3):
                point[i] *= scaling_factors[i]
    # Make resolutions relative to plane
    width_res = int(width_res * width / 100)
    height_res = int(height_res * height / 100)

    # Initialize a list to store pixel data and their positions for each step
    frames_data = []

    # Generate interpolated points and get pixel data
    for step in range(num_steps):
        # Calculate interpolation factor
        t = step / (num_steps - 1)
        # Interpolate points
        p1 = [p1_start[i] * (1 - t) + p1_end[i] * t for i in range(3)]
        p2 = [p2_start[i] * (1 - t) + p2_end[i] * t for i in range(3)]
        p3 = [p3_start[i] * (1 - t) + p3_end[i] * t for i in range(3)]

        # Calculate width and height vectors
        width_vector = [(p2[i] - p1[i]) / width_res for i in range(3)]
        height_vector = [(p3[i] - p1[i]) / height_res for i in range(3)]

        # Initialize list for this frame's data
        frame_data = []

        # Create a list of pixel coordinates and their original positions
        coords = []
        # Create a list of pixel coordinates and their original positions
        def create_coords(height_res, width_res, p1, width_vector, height_vector):
            for i in range(height_res):
                for j in range(width_res):
                    center = [p1[k] + (j + 0.5) * width_vector[k] + (i + 0.5) * height_vector[k] for k in range(3)]
                    center_rounded = [round(c) for c in center]
                    yield (center_rounded, (i, j))
        
        # Create a list of pixel coordinates and their original positions
        coords = list(create_coords(height_res, width_res, p1, width_vector, height_vector))

        # Sort the list by the z-coordinate
        coords.sort(key=lambda n: n[0][2])

        # Add the coordinates and their original positions for this step to the frames_data list
        frames_data.append(coords)

    # Now we'll get all necessary pixel data in one run as we go through the video
    # Initialize a frame index
    frame_index = -1

    # Initialize a list to store images for each step
    images = [np.zeros((height_res, width_res, 3)) for _ in range(num_steps)]

    # Iterate over all the sorted pixel coordinates
    for center, original_pos, step in sorted(
            ((center, original_pos, step) for step, coords in enumerate(frames_data) for center, original_pos in
             coords), key=lambda x: x[0][2]):

        # If the frame index doesn't match with the z-coordinate of the current pixel,
        # read frames until it does
        while frame_index < center[2]:
            ret, frame = cap.read()
            if not ret:
                raise Exception("Couldn't read video")
            frame_index += 1

        # If the coordinates are out of bounds, fill with black
        if center[2] < 0 or center[2] >= duration or center[0] < 0 or center[0] >= width or center[1] < 0 or center[
            1] >= height:
            images[step][original_pos] = [0, 0, 0]
            continue

        # Convert x, y to integers as they represent pixel positions
        x, y = map(int, center[:2])

        # Add pixel color to the image for the current step at the original position
        images[step][original_pos] = frame[y, x]

    # Save the images
    for step, image in enumerate(images):
        # Convert BGR to RGB
        image = cv2.cvtColor(image.astype(np.uint8), cv2.COLOR_BGR2RGB)

        # Create a PIL image
        pil_image = Image.fromarray(image)

        # Save the image
        pil_image.save(f"{output_base_name}_{step}.png")


# This function turns a series of images in a folder into a video file.
def images_to_video(image_dir, video_path, fps=24):
    images = [img for img in os.listdir(image_dir) if img.endswith(".png")]

    # Sort images by their number, not by their string representation
    images.sort(key=lambda img: int(re.findall(r'\d+', os.path.splitext(img)[0])[0]))

    # Read the first image to get the dimensions
    frame = cv2.imread(os.path.join(image_dir, images[0]))
    height, width, layers = frame.shape

    # Create a VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        # Convert relative path to absolute path
    absolute_video_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), video_path))

    video = cv2.VideoWriter(absolute_video_path, fourcc, fps, (width, height))

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

if __name__ == "__main__":
    print('Starting python script...')
    type_of_export = sys.argv[1]  # first argument
    video_path = sys.argv[2]  # second argument
    points = json.loads(sys.argv[3])  # third argument
    resolutions = json.loads(sys.argv[4])  # fourth argument
    output_name = 'cross_section_of_TIMECUBE.png'
    # Parse the arguments if necessary, then pass them to your function
    if type_of_export == 'ImageExport':
        create_cross_section(video_path, points, resolutions, output_name)
    else:
        print('Running video export function!')
        # Create directory for output images to go in
        subdirectory = 'timecube animation subfolder'
        # check if directory exists, and if it doesn't, we create a new path
        try:
            os.makedirs(subdirectory)
        except FileExistsError:
            # directory already exists
            pass

        # Arrays represent top left, top right, and bottom left points of image/plane, respectively
        # points_start = [[0, 2.011826308353337, 38.82721897763515], [100, 2.011826308353337, 38.82721897763515],
        #                 [0, 23.753319512107783, 95.79901905190546]]
        # points_end = [[0, 62.14330284160403, 8.44574085109614], [100, 62.14330284160403, 8.44574085109614],
        #             [0, 96.87672258600332, 99.46181904906989]]
        points_start = points
        points_end = json.loads(sys.argv[5])

        resolutionPercentage = [50, 50]  # percent (out of 100) resolution of image's width and height

        video = "C:/Users/yitzi/Downloads/ezgif.com-gif-to-mp4.mp4"
        print('input video path is: ' + video_path)
        # 'C:/Users/yitzi/Videos/new slitscan/pexels-naveen-g-4190998-1920x1080-25fps.mp4' #girls dancing
        output_name = os.path.join(subdirectory, 'timecube animation')
        numberOfFrames = 30
        image_dir = subdirectory
        timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        output_video_path = f'../dist/video output/TIMESLICED output {timestamp}.mp4'
        print('output video path is: ' + output_video_path)
        fps = 15  # Set the desired frames per second for the output video

        pr = cProfile.Profile() #this is for profiling
        pr.enable() #this is for profiling

        # Run function to output our images in a given subdirectory
        create_animation_optimized(video_path, points_start, points_end, resolutionPercentage, numberOfFrames, output_name)


        # This bit is for profiling the code; comment out before release
        pr.disable()
        s = io.StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats('tottime')  # 'tottime' refers to the total time spent in the function itself
        ps.print_stats(20)  # Change this number to control how many lines are printed
        print(s.getvalue())
        # End of profiling code segment

        # Turn images into video (remember to delete the folder with all the images, if you don't want that)
        images_to_video(image_dir, output_video_path, fps)
    
    print('Finished!')
    sys.exit()
