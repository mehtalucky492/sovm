# Otsuka AEM-codekit Boilerplate
Starter project for Otsuka AEM-codekit 

## Environments
- Prod Preview: https://main--codekit-sovm--oapi-commercial-omni.aem.page/
- Prod Live: https://main--codekit-sovm--oapi-commercial-omni.aem.live/
- QA Preview: https://qa--codekit-sovm-qa--oapi-commercial-omni.aem.page/
- QA Live: https://qa--codekit-sovm-qa--oapi-commercial-omni.aem.live/
- DEV Preview: https://dev--codekit-sovm-dev--oapi-commercial-omni.aem.page/
- DEV Live: https://dev--codekit-sovm-dev--oapi-commercial-omni.aem.live/

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on [www.aem.live](https://www.aem.live/docs/) and [experienceleague.adobe.com](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/authoring), more specifically:
1. [Getting Started](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/edge-dev-getting-started), [Creating Blocks](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/create-block), [Content Modelling](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/content-modeling)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

### Project-Specific Guides

- [Adobe Client Data Layer (ACDL) Integration](./ACDL-README.md) - How to add analytics tracking to blocks

Furthremore, we encourage you to watch the recordings of any of our previous presentations or sessions:
- [Getting started with AEM Authoring and Edge Delivery Services](https://experienceleague.adobe.com/en/docs/events/experience-manager-gems-recordings/gems2024/aem-authoring-and-edge-delivery)

## Prerequisites

- nodejs 18.3.x or newer
- AEM Cloud Service release 2024.8 or newer (>= `17465`)

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-codekit-boilerplate` template
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `aem-codekit-boilerplate` directory in your favorite IDE and start coding :)

## Testing a Branch in Universal Editor

When developing blocks or features on a branch, you can test your changes in Universal Editor before merging to the main branch.

### Setup Steps

1. **Push your changes to a GitHub branch**
   ```sh
   git add .
   git commit -m "Your commit message"
   git push origin your-branch-name
   ```

2. **Create a test page in AEM Author**
   - In AEM Author service, create a new page under a `branches` folder
   - Name the page after your Git branch (e.g., `block-options`)

3. **Load the page with the branch reference**
   - Edit the page in Universal Editor
   - Add the query parameter `?ref=your-branch-name` to the URL
   - Example: `https://author-instance.aem.live/content/your-page?ref=block-options`

4. **Author and test your block**
   - Add your block to the page
   - Configure block options and content
   - The Universal Editor will load code from your specified branch

5. **Publish to preview**
   - Use the Publish button in Universal Editor
   - Choose "Publish to Preview"
   - Your changes will be visible on the preview environment using the branch code

6. **Local development with branch changes**
   - After publishing to preview, your local `aem up` environment will reflect the changes
   - Hot-reload will apply as you continue developing

This workflow allows you to develop and test new blocks or features in isolation without affecting the main branch, ensuring a safe and efficient development process.
