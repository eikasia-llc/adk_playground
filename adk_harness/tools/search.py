"""Search tools for codebase navigation.

These provide structured output for finding files and text, which is more
reliable for the LLM than reading raw shell output from `run_bash`.
"""

import glob
import os
import subprocess

from ..config import WORKSPACE_DIR
from ..paths import resolve


def grep_search(query: str, path: str = ".") -> str:
    """Search for a string or regex pattern within files in the workspace.
    
    Args:
        query: The regex pattern or text to search for.
        path: The directory or file to search within (relative to workspace). Defaults to "."
        
    Returns:
        Structured text containing line-numbered matches.
    """
    resolved_path = resolve(path)
    
    # We use grep -rnH to search recursively and include line numbers and filenames.
    # It will safely timeout if it takes too long.
    try:
        result = subprocess.run(
            ["grep", "-rnH", "-E", query, resolved_path],
            cwd=WORKSPACE_DIR,
            capture_output=True,
            text=True,
            timeout=10,
        )
        
        if result.returncode == 0 and result.stdout:
            # Shorten absolute paths back to relative for the model
            output = result.stdout.replace(WORKSPACE_DIR + "/", "")
            return output
        elif result.returncode == 1:
            return "No matches found."
        else:
            return f"Error running grep (status {result.returncode}): {result.stderr.strip()}"
    except subprocess.TimeoutExpired:
        return "Search timed out. Try a more specific query or path."
    except Exception as e:
        return f"Error running grep: {str(e)}"


def glob_search(pattern: str, path: str = ".") -> str:
    """Find files by matching a glob pattern (e.g. '*.py') within a path.
    
    Args:
        pattern: The glob pattern to match (e.g. '*.py', '**/tests/*.py').
        path: The root directory to start searching from. Defaults to "."
        
    Returns:
        A list of matching file paths.
    """
    resolved_path = resolve(path)
    # Ensure the pattern matches recursively if requested
    if not pattern.startswith("**/") and "**/" not in pattern:
        search_pattern = os.path.join(resolved_path, "**", pattern)
    else:
        search_pattern = os.path.join(resolved_path, pattern)
        
    try:
        matches = glob.glob(search_pattern, recursive=True)
        if not matches:
            # Fallback to simple matching if the user passed something like `*.py` and expected local folder only
            search_pattern = os.path.join(resolved_path, pattern)
            matches = glob.glob(search_pattern, recursive=True)
            
        if not matches:
            return "No files found matching the pattern."
            
        # Strip the workspace dir so the model sees clean relative paths
        clean_matches = [m.replace(WORKSPACE_DIR + "/", "") for m in matches]
        
        # Deduplicate and sort
        clean_matches = sorted(list(set(clean_matches)))
        
        # Truncate if there are way too many results to prevent context flooding
        if len(clean_matches) > 100:
            return "\\n".join(clean_matches[:100]) + f"\\n... and {len(clean_matches) - 100} more files. Please refine your pattern."
            
        return "\\n".join(clean_matches)
    except Exception as e:
        return f"Error running glob search: {str(e)}"
