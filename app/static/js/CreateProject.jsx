import React from "react";
import {Redirect} from 'react-router';
import {SortableContainer, SortableElement, SortableHandle, arrayMove,} from 'react-sortable-hoc';
import Scene from './components/Scene.jsx';

const SortableItem = SortableElement(({scene, projectId, updateOrder, editCallback, errorCallback, updateProjectState}) =>
    <div >
        <Scene key={scene.index} caption={scene.caption}
               thumbnail={scene.thumbnail} uuid={scene.uuid}
               order={scene.order} projectId={projectId}
               updateOrder={updateOrder} editCallback={editCallback}
               errorCallback={errorCallback}
               updateProjectState={updateProjectState} />
    </div>
);

const SortableList = SortableContainer(({scenes, projectId, updateOrder, editCallback, errorCallback, updateProjectState}) => {
    return (
        <div>
            {scenes.map((scene, index) => (
                <SortableItem key = {`item-${index}`}
                              index={index}
                              scene={scene}
                              projectId={projectId}
                              updateOrder={updateOrder}
                              editCallback={editCallback}
                              errorCallback={errorCallback}
                              updateProjectState={updateProjectState} />
            ))}
        </div>
    );
});

export default class CreateProject extends React.Component {

    constructor(props) {
        super(props);
        // direct load (e.g. from a cached URL) is and error condition,
        // because we expect to have created a project ID upon clicking of
        // the 'new project' button so that incremental edits of a new project
        // can be saved -- so if state wasn't initialized, redirectProjects should be true
        let projectId = null, thumbnail = null, redirectProjects = true;
        if (this.props.location.state) {
            redirectProjects = false;
            projectId = this.props.location.state.projectId;
            thumbnail = this.props.location.state.thumbnail;
        }
        this.state = {
            projectId: projectId,
            redirectProjects: redirectProjects,
            thumbnail: thumbnail,
            file: null,
            photo_thumbnail: null,
            scenes: [],
            numScenes: 0,
            project_title: "",
            project_description: "",
            embedUrl: null,
            showShare: false,
            showModal: false,
            showUpload: false,
            showUpdate: false,
            photo_caption: null,
            current_photo: null,
            photoId: null
        };
        this.errorMessage = this.errorMessage.bind(this);
        this.cancelMessage = this.cancelMessage.bind(this);
        this.selectText = this.selectText.bind(this);
        this.updatePhoto = this.updatePhoto.bind(this);
        this.editPhoto = this.editPhoto.bind(this);
        this.updateProjectState = this.updateProjectState.bind(this);
        this.uploadPhoto = this.uploadPhoto.bind(this);
        this.goToProjects = this.goToProjects.bind(this);
        this.updateTitles = this.updateTitles.bind(this);
        this.updateOrder = this.updateOrder.bind(this);
        this.publish = this.publish.bind(this);
        this.fetchPhotos = this.fetchPhotos.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.fileChangedHandler = this.fileChangedHandler.bind(this);
    }

    componentDidMount() {
        this.fetchPhotos()
    }

    fetchPhotos() {
        const url = "/project-details/" + this.state.projectId;
        fetch(url, {
                'credentials': 'include'
        })
        .then(res => res.json())
        .then(
            (result) => {

                let project_title = result.title,
                    project_thumbnail = null;

                if (result.title) {
                    document.getElementById('title-input').value = result.title;
                } else {
                    document.getElementById('title-input').placeholder = "Untitled";
                    project_title = "Untitled"
                };

                if (result.scenesData.length > 0) {
                    project_thumbnail = result.scenesData[0].thumbnail;
                }

                this.setState({
                    scenes: result.scenesData,
                    project_title: project_title,
                    project_description: result.desc,
                    thumbnail: project_thumbnail,
                    numScenes: result.scenesData.length
                });

                if (result.desc) {
                    document.getElementById('project-description').value = result.desc;
                } else {
                    document.getElementById('project-description').placeholder = "Add a description";
                };

            },

            (error) => {
                this.setState({
                    error
                });
            }
        )
    }

    goToProjects() {
        this.setState({
            redirectProjects: true
        });
    }



    updateTitles() {
        const url = "/project-details/" + this.state.projectId;
        var titleData = document.getElementById('title-input').value;
        var descData = document.getElementById('project-description').value;
        var data = {
            titleData: titleData,
            descData: descData,
            sceneData: this.state.scenes
        };
        fetch(url, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
        })
        .then(res => res.json())
        .then(
            (result) => {
                this.fetchPhotos();
            },
            (error) => {
                console.log(error);
                this.setState({
                    error
                });
            }
        )
    }

    publish() {
        const url = "/publish/" + this.state.projectId;
        var titleData = document.getElementById('title-input').value;
        var descData = document.getElementById('project-description').value;
        var data = {
            titleData: titleData,
            descData: descData,
            sceneData: this.state.scenes
        };

        fetch(url, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
        })
        .then(res => res.json())
        .then(
            (result) => {
                if (result.embed_url) {
                    this.setState({embedUrl: result['embed_url'], showShare: true, showModal: true}, () => {
                        this.revealModal();
                    });
                } else {
                    console.log("No embed_url so skipping modal; result:");
                    console.log(result)
                }
            },
            (error) => {
                this.setState({
                    error
                });
            }
        );

    }

    onSortEnd({oldIndex, newIndex}) {
        const {scenes} = this.state;
        var tempScenes = arrayMove(scenes, oldIndex, newIndex);
        this.setState({scenes: tempScenes});
        this.updateOrder();
    }

    updateOrder() {
        const {scenes} = this.state;
        var tempScenes = [];
        for (let i = 0; i < scenes.length; i++) {
            tempScenes.push(scenes[i])
            tempScenes[i].order = tempScenes.length - 1;
        }
        this.setState({scenes: tempScenes});
        this.updateTitles();
    }

    uploadPhoto() {
        const url = `/upload-image/${this.state.projectId}`;

        let caption = document.getElementById('photo-description-input'),
            fileField = document.getElementById('file-object'),
            formData = new FormData();


        formData.append('order', this.state.numScenes);
        formData.append('file', this.state.file);
        formData.append('caption', caption.value);
        formData.append('sceneId', this.state.photoId);
        document.getElementById('modal-loading').style.display = "flex";
        fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(res => res.json())
        .then(
            (result) => {
                document.getElementById('modal-loading').style.display = "none";
                document.getElementById('file-object').value = "";

                if (result.error) {
                    this.setState({showUpload: false, showModal: true, showMessage: true, message: `Error Uploading Image: ${result.error}`}, () => {
                        this.fetchPhotos();
                    });
                } else {
                    this.setState({showUpload: false, showModal: false, showMessage:false}, () => {
                        this.fetchPhotos();
                    });
                }


            },
            (error) => {
                this.setState({showUpload: false, showModal: true, showMessage: true, message: `Error Uploading ${error}`}, () => {
                    this.fetchPhotos();
                });
            }
        )
    }

    errorMessage(e) {
        this.setState({showUpload: false, showModal: true, showUpdate:false, showMessage: true, message: `Error ${e}`}, () => {
            this.revealModal();
        });
    }

    cancelMessage() {
        this.setState({showUpload: false, showModal: false, showMessage: false}, () => {

        });
    }

    updateProjectState(state) {
        // seems like maybe we can't bind setState to child components?
        // but also for now we need to mutate the API result a bit
        // probably cleaner to just return it that way from the API
        if (state.scenesData) {
            state.scenes = state.scenesData;
        }

        this.setState(state);
    }

    editPhoto(uuid) {
        const url = `/scene-details/${this.state.projectId}/${uuid}`;
        fetch(url, {'credentials': 'include'})
        .then(res => res.json())
        .then(
            (result) => {
                if (result.scene_exists == 'True'){
                    this.setState({
                        photo_thumbnail: result.scene_thumbnail,
                        photoId: result.scene_id,
                        photo_caption: result.caption || '',
                        showUpdate: true,
                        current_photo: result.uuid,
                        showModal: true
                    }, () => {
                        this.revealModal();
                    });
                } else {
                    console.log("asked to edit photo which doesn't exist")
                }
            },
            (error) => {
                console.log("ERROR fetching info from server");
                this.setState({showUpload: false, showModal: true, showMessage: true, message: "ERROR fetching info from server"}, () => {
                    this.fetchPhotos();
                });
            }
        )
    }

    updatePhoto() {

        const url = `/update-image/${this.state.projectId}/${this.state.current_photo}`;
        let caption = document.getElementById('photo-description-input'),
            formData = new FormData();

        formData.append('order', this.state.current_photo);
        formData.append('caption', caption.value);
        formData.append('sceneId', this.state.photoId);

        fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(res => res.json())
        .then(
            (result) => {
                this.setState({showUpdate:false, showModal: false}, () => {
                    this.fetchPhotos();
                });
            },
            (error) => {
                console.log(`Error Uploading ${error}`)
                this.setState({showUpload: false, showModal: true, showMessage: true, message: `Error Uploading ${error}`}, () => {
                    this.fetchPhotos();
                });
            }
        )

    }

    revealModal() {
        setTimeout(() => {
            document.getElementById('modal-overlay').style.opacity = "1";
            document.getElementById('modal').style.bottom = "0";
        }, 100)
    }

    closeModal() {
        document.getElementById('modal-overlay').style.opacity = "0";
        document.getElementById('modal').style.bottom = "-80vh";
        setTimeout(() => {
            this.setState({showShare: false, showModal: false, showUpdate:false, showUpload:false})
        }, 400)
        document.getElementById("file-object").value = "";
    }

    selectText(t) {
        let el = document.getElementById(t);
        if (el) {
            el.focus();
            el.select();
            el.setSelectionRange(0, 9999);
        }
    }

    fileChangedHandler(event) { // TODO: this fetch can probably be removed...

        let reader = new FileReader(),
            file = event.target.files[0],
            caption = null;

        reader.onloadend = () => {
            if (reader.result) {
                this.setState({
                    file: file,
                    photo_thumbnail: reader.result,
                    photo_caption: caption,
                    showUpload: true,
                    showModal: true
                }, () => {
                    this.revealModal();
                });
            } else {
                reader.abort();
                document.getElementById("file-object").value = "";
            }

        }
        reader.readAsDataURL(file);

    }

    render() {
        const {redirectProjects, showShare, showModal, showUpload, showUpdate, showMessage, message, scenes, thumbnail, photo_thumbnail, photo_caption, photoId, project_title, project_description} = this.state;

        if (redirectProjects) {
            return ( <Redirect to = {{pathname: '/list-projects', push: true}}/>);
        }

        let modal = null,
            modal_body = null,
            share = {
                description: "",
                embed: null,
                url: `${this.state.embedUrl}`,
                url_encoded: null,
                facebook: null,
                twitter: null
            },
            image_preview = null,
            project_image = null,
            modal_title = "",
            modal_header = ["", "", ""],
            modal_type = "modal-content",
            modal_footer = "",
            modal_loading = "";



        if (this.state.photo_thumbnail) {
            image_preview = (<img src={this.state.photo_thumbnail} />);
        } else {
            image_preview = (<div id="upload-placeholder"><span className="icon-image"></span></div>);
        }

        if (this.state.thumbnail) {
            project_image = (<img src={this.state.thumbnail} />);
        } else {
            project_image = (<div id="upload-placeholder"><span className="icon-image"></span></div>);
        }

        if (showModal) {

            if (showMessage) {

                modal_header[1] = "Error";
                modal_header[2] = (<div className="modal-header-button" onClick={this.cancelMessage}> OK </div>);
                modal_body = (
                    <div className="modal-body">
                        <p className="modal-message">{this.state.message}</p>
                    </div>
                );
            }

            if (showShare) {
                if (this.state.embedUrl) {
                    share.url_encoded = encodeURIComponent(share.url);
                    share.embed = `<iframe width="100%" height="600" src=${this.state.embedUrl} frameborder="0" allowfullscreen />`;

                    if (this.state.project_description) {
                        share.description = `: ${this.state.project_description}`;
                    }
                    share.twitter = `http://twitter.com/share?text=${this.state.project_title}${share.description}&url=${share.url}&hashtags=SceneVR,knightlab,VR&via=knightlab`;

                    share.facebook = `https://www.facebook.com/dialog/feed?app_id=1986212374732747&display=page&picture=${encodeURIComponent(this.state.thumbnail)}&caption=${encodeURIComponent("SceneVR")}&name=${encodeURIComponent(this.state.project_title)}&description=${encodeURIComponent(share.description)}&link=${share.url_encoded}`;

                    modal_title = "Share";

                    modal_type = "modal-content modal-content-incl";

                    modal_header[1] = "Share";

                    modal_footer = (
                        <div className="modal-close">
                            <button className="close-button" id="close-button" onClick={this.closeModal}>Cancel</button>
                        </div>
                    );
                    let preview_text = "";
                    if (this.state.project_title != "Untitled" || this.state.project_description) {
                        preview_text = (
                            <div className="modal-preview-item">
                                <h4>{this.state.project_title}</h4>
                                <p>{this.state.project_description}</p>
                            </div>
                        )
                    }
                    modal_body = (
                        <div className="modal-body">
                            <div className="modal-preview-container">
                                <div className="modal-preview-item">
                                    {project_image}
                                </div>
                                {preview_text}
                            </div>
                            <div className="modal-list">
                                <div className="modal-list-item">
                                    <span className="icon-link"></span>
                                </div>
                                <div className="modal-list-item">
                                    <input id="share-link" aria-label="Shareable link" className="share-url" type="text" onClick={()=>{this.selectText("share-link")}} value={share.url} readOnly />
                                </div>
                            </div>
                            <div className="modal-list">
                                <div className="modal-list-item">
                                    <span className="icon-embed2"></span>
                                </div>
                                <div className="modal-list-item">
                                    <input aria-label="Embed code" id="share-embed" className="share-url" type="text" onClick={() => {this.selectText("share-embed")}} value={share.embed} readOnly />
                                </div>
                            </div>
                            <div className="modal-link-list">
                                <a className="modal-action-button" aria-label="Open shareable link in new tab" href={share.url} target="_blank">
                                    <div className="modal-action-button-content">
                                        <span className="icon-new-tab"></span>
                                    </div>
                                    Preview
                                </a>
                                <a className="modal-action-button" aria-label="Share on Twitter" href={share.twitter} target="_blank">
                                    <div className="modal-action-button-content">
                                        <span className="icon-twitter"></span>
                                    </div>
                                    Twitter
                                </a>
                                <a className="modal-action-button" aria-label="Share on Facebook" href={share.facebook} target="_blank">
                                    <div className="modal-action-button-content">
                                        <span className="icon-facebook2"></span>
                                    </div>
                                    Facebook
                                </a>
                            </div>
                        </div>
                    );

                } else {
                    console.warn('showShare is true but this.state.embedUrl is null. This should not be.')
                }
            }
            if (showUpload || showUpdate) {
                modal_header[0] = (<div className="modal-header-button" onClick={this.closeModal}> Cancel </div>);
                modal_header[1] = "Upload";
                modal_header[2] = (<div className="modal-header-button" onClick={this.uploadPhoto}> Upload </div>);
                modal_loading = (<div id="modal-loading"><div id="modal-uploading-message">Uploading</div></div>)
                modal_body = (
                    <div className="modal-body">
                        <div id="upload-thumbnail">
                            {image_preview}
                        </div>
                        <div id="upload-description">
                            <textarea id="photo-description-input" rows="5" type="text" aria-label="Description of photo" placeholder="Add a description" defaultValue={photo_caption} />
                        </div>
                    </div>
                );
            }

            if (showUpdate) {
                modal_header[1] = "Update";
                modal_header[2] = (<div className="modal-header-button" onClick={this.updatePhoto}> Update </div>);

            }

            modal = (
                <div>
                    <div className="modal-overlay" id="modal-overlay"></div>
                    <div className="modal" id="modal">
                        <div className={modal_type}>
                            {modal_loading}
                            <div className="modal-header">
                                <div className="modal-header-item">
                                    {modal_header[0]}
                                </div>
                                <div className="modal-header-item">
                                    <h3>{modal_header[1]}</h3>
                                </div>
                                <div className="modal-header-item">
                                    {modal_header[2]}
                                </div>
                            </div>
                            {modal_body}
                        </div>
                        {modal_footer}
                    </div>
                </div>
            );

        }


        return (
            <div id="CreateProject">

                {modal}

                <div id="create-header">
                    <div id="header-left">
                        <div id="nav-title" className="link" onClick={this.goToProjects}> &lt; Your Projects </div>
                    </div>
                    <div id="header-right">
                        <div id="publish" onClick={this.publish}> <span className="icon-share"></span></div>
                    </div>
                </div>

                <div id="create-project-content">
                    <input id="title-input" type="text" onBlur={this.updateTitles}/>
                    <textarea rows="3" id="project-description" type="text" onBlur={this.updateTitles} />
                    <div id="scenes-container">
                        <SortableList scenes={scenes}
                                      updateOrder={this.updateOrder}
                                      updateProjectState={this.updateProjectState}
                                      projectId={this.state.projectId}
                                      onSortEnd={this.onSortEnd.bind(this)}
                                      useDragHandle={true}
                                      errorCallback={this.errorMessage}
                                      editCallback={this.editPhoto}/>

                        <div id="new-photo" className="button-bottom-container">
                            <label id="new-photo" className="button-bottom" htmlFor="file-object">
                                <span className="icon-image"></span> Add Photo
                            </label>
                            <input id="file-object" type="file" accept=".jpg, .jpeg" onChange={this.fileChangedHandler} />
                        </div>



                    </div>
                </div>

            </div>
        );
    }
}
