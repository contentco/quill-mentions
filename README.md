# Quill Mentions

Custom module for [Quill.js](https://github.com/quilljs/quill) to allow mentions

## Usage
### Webpack/ES6

```javascript
var quill = new Quill('#quill-editor', {
        modules:{
            mentions: {
                users: [{
                        label: 'Aron',
                        username: 'Aron Hunt'
                    },
                    {
                        label: 'Bob',
                        username: 'Bobby Johnson'
                    },
                    {
                        label: 'Dennis',
                        username: 'Dennis'
                    }
                ]
            }
          },
          theme: 'snow'
});
```

## Contributing

Please check out our [contributing guidelines](CONTRIBUTING.md).