#!/usr/bin/env python

import argparse
import json
import os
import re
import uuid

parser = argparse.ArgumentParser(
    description="Generate UUIDs for info*.json files that don't already have them."
)
parser.add_argument("directory", help="the directory to search for info*.json files")
parser.add_argument(
    "-v",
    "--verbose",
    action="store_true",
    help="list all the files for which UUIDs were generated",
)
parser.add_argument(
    "-n",
    "--new",
    action="store_true",
    help="generate new UUIDs for all files, even if they already have one",
)
args = parser.parse_args()


skip_dirs = [".git", "elements"]

error_list = []


def add_uuid_to_file(filename):
    try:
        with open(filename) as in_f:
            contents = in_f.read()
        data = json.loads(contents)
        if "uuid" in data:
            # file already has a UUID
            if not args.new:
                return 0  # we don't want new UUIDs, so just skip this file

            # replace the exising UUID
            (new_contents, n_sub) = re.subn(
                r'"uuid":(\s*)"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"',
                rf'"uuid":\1"{uuid.uuid4()}"',
                contents,
            )
            if n_sub == 0:
                raise ValueError(
                    f"{filename}: file already contains a UUID, but the regexp failed to find it"
                )
            if n_sub > 1:
                raise ValueError(
                    f"{filename}: regexp found multiple UUIDs and we can't determine which one to replace"
                )

        else:
            # file doesn't have a UUID, so insert one at the start of the file
            (new_contents, n_sub) = re.subn(
                r"^(\s*{)(\s*)", rf'\1\2"uuid": "{uuid.uuid4()}",\2', contents
            )
            if n_sub == 0:
                raise ValueError(
                    f"{filename}: file doesn't start with a {{ character, so we can't insert a UUID property"
                )
            if n_sub > 1:
                raise RuntimeError(f"{filename}: impossible internal error occurred")

        tmp_filename = filename + ".tmp_with_uuid"
        if os.path.exists(tmp_filename):
            os.remove(tmp_filename)  # needed on Windows
        with open(tmp_filename, "w") as out_f:
            out_f.write(new_contents)
        os.remove(filename)  # needed on Windows
        os.rename(tmp_filename, filename)
        if args.verbose:
            print("Created a UUID for ", filename)
        return 1
    except Exception as error:
        error_list.append(error)
        return 0


num_files = 0
num_changed = 0

for root, dirs, files in os.walk(args.directory):
    for skip_dir in skip_dirs:
        if skip_dir in dirs:
            dirs.remove(skip_dir)
    for f in files:
        if re.fullmatch(r"info.*\.json", f):
            filename = os.path.join(root, f)
            num_files += 1
            num_changed += add_uuid_to_file(filename)

print(f"Processed {num_files} files")
print(f"Generated UUID in {num_changed} files")

if error_list:
    print()
    print("Errors occurred during processing")
    for error in error_list:
        print(error)
else:
    print("Processing successsfully complete with no errors")
