package main

import (
	"log"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

func main() {
	config := []string{"VITE_OBP_API_HOST", "VITE_OBP_API_MANAGER_HOST"}
	configMap := make(map[string]string)

	for _, key := range config {
		rawURL := os.Getenv(key)
		if rawURL == "" {
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
