package main

import (
	"log"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"fmt"
)

// As the frontend environment is read at build time, we need to reprocess the values
// at container runtime.
// This app will search and replace the values set at build time from this build environment: Dockerfiles/frontend_build.env
// with values taken from the container environment.

func main() {
	// Define the build env variables to be replaced at container run time
	// url config variables are expected to be a valid URL in the container environment
	url_config := []string{"VITE_OBP_API_HOST", "VITE_OBP_API_MANAGER_HOST", "VITE_OBP_API_PORTAL_HOST", "VITE_OBP_LOGO_URL"}
	// DANGERZONE: The following strings will be replaced by container environment variables without any checking of whatever!!!
	config := []string{"VITE_OBP_API_VERSION", "VITE_OBP_LINKS_COLOR", "VITE_OBP_HEADER_LINKS_COLOR", "VITE_OBP_HEADER_LINKS_HOVER_COLOR", "VITE_OBP_HEADER_LINKS_BACKGROUND_COLOR", "VITE_OBP_API_DEFAULT_RESOURCE_DOC_VERSION", "VITE_CHATBOT_ENABLED", "VITE_CHATBOT_URL"}
	configMap := make(map[string]string)

	for _, key := range config {
	    value := os.Getenv(key)
	    if value == "" {
            fmt.Printf("Skipping: Environment variable %s is not set\n", key)
            continue
        }
		configMap[key] = value
	}

	for _, key := range url_config {
		rawURL := os.Getenv(key)
		if rawURL == "" {
		    fmt.Printf("Skipping: Environment variable %s is not set\n", key)
			continue
		}
		cleanURL := checkURL(rawURL)
		configMap[key] = cleanURL
	}

	dir := "/opt/app-root/src/assets"
	pattern := "index-.*\\.js$"

	re, err := regexp.Compile(pattern)
	if err != nil {
		log.Fatal(err)
	}

	files, err := os.ReadDir(dir)
	if err != nil {
		log.Fatal(err)
	}

	for _, file := range files {
		if re.MatchString(file.Name()) {
			filePath := filepath.Join(dir, file.Name())
			content, err := os.ReadFile(filePath)
			if err != nil {
				panic(err)
			}
			modifiedContent := string(content)
			for old, new := range configMap {
				modifiedContent = strings.Replace(modifiedContent, old, new, -1)
			}
			err = os.WriteFile(filePath, []byte(modifiedContent), 0644)
			if err != nil {
				panic(err)
			}
		}
	}

}

func checkURL(rawURL string) string {

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		log.Fatal(err)
	}

	validURL := regexp.MustCompile(`^https?:\/\/[^\s/$.?#].[^\s]*$`)
	if !validURL.MatchString(rawURL) {
		log.Fatal("Invalid URL or potential code injection detected")
	}

	cleanURL := &url.URL{
		Scheme: parsedURL.Scheme,
		Host:   parsedURL.Host,
		Path:   parsedURL.Path,
	}
	return cleanURL.String()
}
